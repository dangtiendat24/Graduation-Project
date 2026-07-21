import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { InjectRepository } from '@nestjs/typeorm'
import { HttpService } from '@nestjs/axios'
import { Repository } from 'typeorm'
import { firstValueFrom } from 'rxjs'
import { Job } from './job.entity'
import { Company } from '../companies/company.entity'
import { CreateJobDto, ScoringWeightsDto } from './dto/create-job.dto'
import { UpdateJobDto } from './dto/update-job.dto'
import { SearchJobsDto } from './dto/search-jobs.dto'

const COMPANY_JOIN_CONDITION =
  'company.id = job.companyId OR (job.companyId IS NULL AND company.recruiterId = job.recruiterId)'

@Injectable()
export class JobsService {
  private readonly logger = new Logger(JobsService.name)

  constructor(
    @InjectRepository(Job)
    private readonly repo: Repository<Job>,
    @InjectRepository(Company)
    private readonly companyRepo: Repository<Company>,
    private readonly httpService: HttpService,
    private readonly config: ConfigService,
  ) {}

  async create(recruiterId: string, dto: CreateJobDto): Promise<Job> {
    this.assertValidScoringWeights(dto.scoringWeights)
    const company = await this.companyRepo.findOne({ where: { recruiterId } })
    const job = this.repo.create({
      ...dto,
      recruiterId,
      companyId: company?.id ?? null,
      status: dto.status ?? 'draft',
      headcount: dto.headcount ?? 1,
    })
    const saved = await this.repo.save(job)
    void this.embedJob(saved)
    return saved
  }

  async findByRecruiter(recruiterId: string): Promise<Job[]> {
    return this.repo.find({
      where: { recruiterId },
      order: { updatedAt: 'DESC' },
    })
  }

  async findActive(): Promise<Job[]> {
    return this.repo.find({
      where: { status: 'active' },
      relations: ['company'],
      order: { createdAt: 'DESC' },
    })
  }

  async search(params: SearchJobsDto): Promise<Job[]> {
    const qb = this.repo
      .createQueryBuilder('job')
      .leftJoinAndMapOne('job.company', Company, 'company', COMPANY_JOIN_CONDITION)
      .where('job.status = :status', { status: 'active' })

    if (params.q) {
      qb.andWhere(
        '(job.title ILIKE :q OR CAST(job.required_skills AS TEXT) ILIKE :q)',
        { q: `%${params.q}%` },
      )
    }
    if (params.location) {
      qb.andWhere('job.location ILIKE :location', { location: `%${params.location}%` })
    }
    if (params.workModel) {
      qb.andWhere('job.workModel = :workModel', { workModel: params.workModel })
    }
    if (params.level) {
      qb.andWhere('job.level = :level', { level: params.level })
    }
    if (params.companyId) {
      qb.andWhere('job.companyId = :companyId', { companyId: params.companyId })
    }

    return qb.orderBy('job.createdAt', 'DESC').getMany()
  }

  async findOne(id: string): Promise<Job> {
    const job = await this.repo
      .createQueryBuilder('job')
      .leftJoinAndMapOne('job.company', Company, 'company', COMPANY_JOIN_CONDITION)
      .where('job.id = :id', { id })
      .getOne()
    if (!job) throw new NotFoundException('Không tìm thấy tin tuyển dụng')
    return job
  }

  async update(recruiterId: string, id: string, dto: UpdateJobDto): Promise<Job> {
    this.assertValidScoringWeights(dto.scoringWeights)
    const job = await this.findOne(id)
    if (job.recruiterId !== recruiterId) {
      throw new ForbiddenException('Bạn không có quyền chỉnh sửa tin tuyển dụng này')
    }
    Object.assign(job, dto)
    const saved = await this.repo.save(job)
    void this.embedJob(saved)
    return saved
  }

  /** Trọng số phải cộng lại đúng 1 (dung sai làm tròn 0.001) — nếu không sẽ làm sai lệch overall_score */
  private assertValidScoringWeights(weights?: ScoringWeightsDto | null): void {
    if (!weights) return
    const sum = weights.skills + weights.experience + weights.education
    if (Math.abs(sum - 1) > 0.001) {
      throw new BadRequestException(
        `Tổng trọng số scoringWeights phải bằng 1 (hiện tại: ${sum.toFixed(3)})`,
      )
    }
  }

  private async embedJob(job: Job): Promise<void> {
    const jobText = [job.title, job.description, job.requirements, ...(job.requiredSkills ?? [])]
      .filter(Boolean)
      .join('\n')

    try {
      const aiServiceUrl = this.config.get<string>('AI_SERVICE_URL', 'http://localhost:8000')
      await firstValueFrom(
        this.httpService.post(`${aiServiceUrl}/api/ai/matching/embeddings/job`, {
          job_id: job.id,
          job_text: jobText,
        }),
      )
    } catch (err) {
      this.logger.warn(`Lưu embedding Job thất bại cho job ${job.id}: ${(err as Error).message}`)
    }
  }

  async close(recruiterId: string, id: string): Promise<Job> {
    return this.update(recruiterId, id, { status: 'closed' })
  }

  async remove(recruiterId: string, id: string): Promise<void> {
    const job = await this.findOne(id)
    if (job.recruiterId !== recruiterId) {
      throw new ForbiddenException('Bạn không có quyền xóa tin tuyển dụng này')
    }
    await this.repo.remove(job)
  }
}
