import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SavedJob } from './saved-job.entity';
import { Job } from '../jobs/job.entity';

@Injectable()
export class SavedJobsService {
  constructor(
    @InjectRepository(SavedJob)
    private readonly repo: Repository<SavedJob>,
    @InjectRepository(Job)
    private readonly jobRepo: Repository<Job>,
  ) {}

  /** Id các tin đã lưu của candidate — FE dùng để tô trạng thái nút "Lưu tin" trên danh sách/chi tiết. */
  async listSavedJobIds(candidateId: string): Promise<string[]> {
    const rows = await this.repo.find({
      where: { candidateId },
      select: { jobId: true },
    });
    return rows.map((r) => r.jobId);
  }

  /** Idempotent — bấm lưu nhiều lần vẫn chỉ có 1 dòng, không lỗi. */
  async save(candidateId: string, jobId: string): Promise<{ saved: true }> {
    const job = await this.jobRepo.findOne({ where: { id: jobId } });
    if (!job) throw new NotFoundException('Không tìm thấy tin tuyển dụng');

    const existing = await this.repo.findOne({
      where: { candidateId, jobId },
    });
    if (!existing) {
      await this.repo.save(this.repo.create({ candidateId, jobId }));
    }
    return { saved: true };
  }

  /** Idempotent — bỏ lưu tin chưa từng lưu vẫn trả về bình thường, không lỗi. */
  async unsave(candidateId: string, jobId: string): Promise<{ saved: false }> {
    await this.repo.delete({ candidateId, jobId });
    return { saved: false };
  }
}
