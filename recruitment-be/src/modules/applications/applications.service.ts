import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as path from 'path';
import 'multer';
import { Application, ApplicationStatus } from './application.entity';
import { ApplicationStatusHistory } from './application-status-history.entity';
import { Job } from '../jobs/job.entity';
import { StorageService } from '../storage/storage.service';
import { ApplicationCvParserService } from './application-cv-parser.service';
import { CreateApplicationDto } from './dto/create-application.dto';

const NON_REAPPLICABLE_STATUSES: ApplicationStatus[] = ['hired', 'rejected'];

@Injectable()
export class ApplicationsService {
  constructor(
    @InjectRepository(Application)
    private readonly repo: Repository<Application>,
    @InjectRepository(Job)
    private readonly jobRepo: Repository<Job>,
    @InjectRepository(ApplicationStatusHistory)
    private readonly statusHistoryRepo: Repository<ApplicationStatusHistory>,
    private readonly storage: StorageService,
    private readonly cvParser: ApplicationCvParserService,
  ) {}

  async apply(
    candidateId: string,
    dto: CreateApplicationDto,
    file: Express.Multer.File,
  ): Promise<Application> {
    const job = await this.jobRepo.findOne({ where: { id: dto.jobId } });
    if (!job) throw new NotFoundException('Không tìm thấy tin tuyển dụng');

    const existing = await this.repo.findOne({
      where: { candidateId, jobId: dto.jobId },
      order: { createdAt: 'DESC' },
    });
    if (existing && !NON_REAPPLICABLE_STATUSES.includes(existing.status)) {
      throw new ConflictException(
        'Bạn đã nộp đơn ứng tuyển cho tin tuyển dụng này rồi',
      );
    }

    const ext = path.extname(file.originalname);
    const key = `applications/${candidateId}/${dto.jobId}/${Date.now()}${ext}`;
    const cvUrl = await this.storage.upload(key, file.buffer, file.mimetype);

    const application = this.repo.create({
      candidateId,
      jobId: dto.jobId,
      cvUrl,
      status: 'pending',
    });
    const saved = await this.repo.save(application);

    await this.statusHistoryRepo.save(
      this.statusHistoryRepo.create({
        applicationId: saved.id,
        fromStatus: null,
        toStatus: 'pending',
        changedBy: null,
      }),
    );

    await this.cvParser.enqueueParse(saved.id);

    return saved;
  }

  async getStatusForJob(
    candidateId: string,
    jobId: string,
  ): Promise<{
    hasApplied: boolean;
    status: ApplicationStatus | null;
    appliedAt: Date | null;
  }> {
    const existing = await this.repo.findOne({
      where: { candidateId, jobId },
      order: { createdAt: 'DESC' },
    });
    return {
      hasApplied:
        !!existing && !NON_REAPPLICABLE_STATUSES.includes(existing.status),
      status: existing?.status ?? null,
      appliedAt: existing?.createdAt ?? null,
    };
  }
}
