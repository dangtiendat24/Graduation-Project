import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SavedJob } from './saved-job.entity';
import { Job } from '../jobs/job.entity';
import { JobsService } from '../jobs/jobs.service';

export interface SavedJobItem extends Job {
  savedAt: Date;
}

@Injectable()
export class SavedJobsService {
  constructor(
    @InjectRepository(SavedJob)
    private readonly repo: Repository<SavedJob>,
    @InjectRepository(Job)
    private readonly jobRepo: Repository<Job>,
    private readonly jobsService: JobsService,
  ) {}

  /** Id các tin đã lưu của candidate — FE dùng để tô trạng thái nút "Lưu tin" trên danh sách/chi tiết. */
  async listSavedJobIds(candidateId: string): Promise<string[]> {
    const rows = await this.repo.find({
      where: { candidateId },
      select: { jobId: true },
    });
    return rows.map((r) => r.jobId);
  }

  /**
   * Tin đã lưu kèm đầy đủ thông tin job (company, kỹ năng...) cho trang "Việc làm đã lưu" —
   * dùng lại jobsService.findOne() để có đúng dữ liệu company (kể cả fallback theo recruiterId
   * khi job chưa gắn company_id) giống hệt trang danh sách/chi tiết công khai, tránh lặp logic join.
   * saved_jobs cascade xoá theo job nên về lý thuyết không có jobId mồ côi, nhưng vẫn phòng hờ lọc null.
   */
  async listSavedJobs(candidateId: string): Promise<SavedJobItem[]> {
    const rows = await this.repo.find({
      where: { candidateId },
      order: { createdAt: 'DESC' },
    });

    const items = await Promise.all(
      rows.map(async (row): Promise<SavedJobItem | null> => {
        try {
          const job = await this.jobsService.findOne(row.jobId);
          return { ...job, savedAt: row.createdAt };
        } catch {
          return null;
        }
      }),
    );

    return items.filter((item): item is SavedJobItem => item !== null);
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
