import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Job } from './job.entity'
import { CreateJobDto } from './dto/create-job.dto'
import { UpdateJobDto } from './dto/update-job.dto'

@Injectable()
export class JobsService {
  constructor(
    @InjectRepository(Job)
    private readonly repo: Repository<Job>,
  ) {}

  async create(recruiterId: string, dto: CreateJobDto): Promise<Job> {
    const job = this.repo.create({
      ...dto,
      recruiterId,
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
      order: { createdAt: 'DESC' },
    })
  }

  async findOne(id: string): Promise<Job> {
    const job = await this.repo.findOne({ where: { id } })
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
