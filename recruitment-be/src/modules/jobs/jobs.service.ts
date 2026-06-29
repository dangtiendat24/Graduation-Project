import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Job } from './job.entity'
import { Company } from '../companies/company.entity'
import { CreateJobDto } from './dto/create-job.dto'
import { UpdateJobDto } from './dto/update-job.dto'
import { SearchJobsDto } from './dto/search-jobs.dto'

const COMPANY_JOIN_CONDITION =
  'company.id = job.companyId OR (job.companyId IS NULL AND company.recruiterId = job.recruiterId)'

@Injectable()
export class JobsService {
  constructor(
    @InjectRepository(Job)
    private readonly repo: Repository<Job>,
    @InjectRepository(Company)
    private readonly companyRepo: Repository<Company>,
  ) {}

  async create(recruiterId: string, dto: CreateJobDto): Promise<Job> {
    const company = await this.companyRepo.findOne({ where: { recruiterId } })
    const job = this.repo.create({
      ...dto,
      recruiterId,
      companyId: company?.id ?? null,
      status: dto.status ?? 'draft',
      headcount: dto.headcount ?? 1,
    })
    return this.repo.save(job)
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
    const job = await this.findOne(id)
    if (job.recruiterId !== recruiterId) {
      throw new ForbiddenException('Bạn không có quyền chỉnh sửa tin tuyển dụng này')
    }
    Object.assign(job, dto)
    return this.repo.save(job)
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
