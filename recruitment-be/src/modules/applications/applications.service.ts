import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as path from 'path';
import 'multer';
import { Application, ApplicationStatus } from './application.entity';
import { ApplicationStatusHistory } from './application-status-history.entity';
import { Job } from '../jobs/job.entity';
import { User } from '../users/user.entity';
import { CandidateResume } from '../profile/entities/candidate-resume.entity';
import { StorageService } from '../storage/storage.service';
import { MailService } from '../mail/mail.service';
import { ApplicationCvParserService } from './application-cv-parser.service';
import { CreateApplicationDto } from './dto/create-application.dto';
import { DashboardCacheService } from '../dashboard/dashboard-cache.service';
import { shouldNotify } from '../settings/notification-preferences';

/** Chỉ trạng thái này mới cho phép ứng viên nộp lại CV cho cùng 1 job — mọi trạng thái khác (kể cả 'hired') đều chặn nộp lại. */
const REAPPLICABLE_STATUSES: ApplicationStatus[] = ['rejected'];

@Injectable()
export class ApplicationsService {
  private readonly logger = new Logger(ApplicationsService.name);

  constructor(
    @InjectRepository(Application)
    private readonly repo: Repository<Application>,
    @InjectRepository(Job)
    private readonly jobRepo: Repository<Job>,
    @InjectRepository(ApplicationStatusHistory)
    private readonly statusHistoryRepo: Repository<ApplicationStatusHistory>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(CandidateResume)
    private readonly resumeRepo: Repository<CandidateResume>,
    private readonly storage: StorageService,
    private readonly mailService: MailService,
    private readonly cvParser: ApplicationCvParserService,
    private readonly dashboardCache: DashboardCacheService,
  ) {}

  async apply(
    candidateId: string,
    dto: CreateApplicationDto,
    file: Express.Multer.File,
  ): Promise<Application> {
    return this.createApplication(
      candidateId,
      dto.jobId,
      file.buffer,
      file.originalname,
      file.mimetype,
    );
  }

  /** Ứng tuyển bằng CV đã có sẵn trong hồ sơ cá nhân — không bắt ứng viên chọn lại file từ máy. */
  async applyWithProfileCv(
    candidateId: string,
    dto: CreateApplicationDto,
  ): Promise<Application> {
    const resume = await this.resumeRepo.findOne({ where: { candidateId } });
    if (!resume) {
      throw new NotFoundException(
        'Bạn chưa có CV nào trong hồ sơ cá nhân — vui lòng tải CV lên trước.',
      );
    }

    const buffer = await this.storage.download(resume.cvFileName);
    const ext = path.extname(resume.cvFileName).toLowerCase();
    const mimetype =
      ext === '.docx'
        ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        : 'application/pdf';

    return this.createApplication(
      candidateId,
      dto.jobId,
      buffer,
      resume.cvOriginalName,
      mimetype,
    );
  }

  private async createApplication(
    candidateId: string,
    jobId: string,
    fileBuffer: Buffer,
    fileOriginalName: string,
    fileMimetype: string,
  ): Promise<Application> {
    const job = await this.jobRepo.findOne({ where: { id: jobId } });
    if (!job) throw new NotFoundException('Không tìm thấy tin tuyển dụng');

    const existing = await this.repo.findOne({
      where: { candidateId, jobId },
      order: { createdAt: 'DESC' },
    });
    if (existing && !REAPPLICABLE_STATUSES.includes(existing.status)) {
      throw new ConflictException(
        'Bạn đã nộp đơn ứng tuyển cho tin tuyển dụng này rồi',
      );
    }

    const ext = path.extname(fileOriginalName);
    const key = `applications/${candidateId}/${jobId}/${Date.now()}${ext}`;
    const cvUrl = await this.storage.upload(key, fileBuffer, fileMimetype);

    const application = this.repo.create({
      candidateId,
      jobId,
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

    await this.dashboardCache.invalidate(job.recruiterId);
    await this.cvParser.enqueueParse(saved.id);
    await this.notifyRecruiterNewApplication(
      job.recruiterId,
      candidateId,
      job.title,
    );

    return saved;
  }

  /** Không để lỗi gửi mail làm hỏng luồng nộp CV chính — chỉ log lại nếu thất bại */
  private async notifyRecruiterNewApplication(
    recruiterId: string,
    candidateId: string,
    jobTitle: string,
  ): Promise<void> {
    try {
      const recruiter = await this.userRepo.findOne({
        where: { id: recruiterId },
      });
      if (
        !recruiter ||
        !shouldNotify(recruiter.notificationPreferences, 'newApplication')
      ) {
        return;
      }
      const candidate = await this.userRepo.findOne({
        where: { id: candidateId },
      });
      await this.mailService.sendNewApplicationEmail(
        recruiter.email,
        recruiter.fullName,
        candidate?.fullName ?? 'Một ứng viên',
        jobTitle,
      );
    } catch (err) {
      this.logger.error(
        `Gửi email thông báo ứng viên mới thất bại: ${(err as Error).message}`,
      );
    }
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
        !!existing && !REAPPLICABLE_STATUSES.includes(existing.status),
      status: existing?.status ?? null,
      appliedAt: existing?.createdAt ?? null,
    };
  }
}
