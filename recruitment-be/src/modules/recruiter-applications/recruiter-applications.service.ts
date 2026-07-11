import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  VALID_TRANSITIONS,
  ApplicationStatus,
} from '@smart-recruitment/shared';
import { Application } from '../applications/application.entity';
import { ApplicationStatusHistory } from '../applications/application-status-history.entity';
import {
  MatchingResult,
  MatchRecommendation,
  MatchingCriteria,
} from '../applications/matching-result.entity';
import { Job } from '../jobs/job.entity';
import { MailService } from '../mail/mail.service';
import {
  GetJobApplicationsQueryDto,
  ScoreBand,
} from './dto/get-job-applications-query.dto';
import { UpdateApplicationStatusDto } from './dto/update-application-status.dto';

const SCORE_BAND_RANGES: Record<
  ScoreBand,
  { min: number; max: number | null }
> = {
  high: { min: 80, max: null },
  medium: { min: 60, max: 80 },
  low: { min: -1, max: 60 },
};

/** Chuyển sang các trạng thái này sẽ tự động gửi email thông báo cho ứng viên */
const EMAIL_NOTIFY_STATUSES: ApplicationStatus[] = ['interviewed', 'rejected'];

interface ApplicationRow {
  applicationId: string;
  appliedAt: Date;
  updatedAt: Date;
  status: ApplicationStatus;
  candidateId: string;
  candidateFullName: string;
  candidateEmail: string;
  candidatePhone: string | null;
  candidateAvatarUrl: string | null;
  overallScore: string | null;
  recommendation: MatchRecommendation | null;
  criteria: MatchingCriteria | null;
  explanation: string | null;
}

export interface JobApplicationListItem {
  applicationId: string;
  appliedAt: string;
  updatedAt: string;
  status: ApplicationStatus;
  candidate: {
    id: string;
    fullName: string;
    email: string;
    phone: string | null;
    avatarUrl: string | null;
  };
  matching: {
    overallScore: number | null;
    recommendation: MatchRecommendation | null;
    criteria: MatchingCriteria | null;
    explanation: string | null;
  } | null;
}

export interface GetJobApplicationsResponse {
  data: JobApplicationListItem[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

@Injectable()
export class RecruiterApplicationsService {
  constructor(
    @InjectRepository(Application)
    private readonly appRepo: Repository<Application>,
    @InjectRepository(ApplicationStatusHistory)
    private readonly historyRepo: Repository<ApplicationStatusHistory>,
    @InjectRepository(Job)
    private readonly jobRepo: Repository<Job>,
    private readonly mailService: MailService,
  ) {}

  async getJobApplications(
    recruiterId: string,
    jobId: string,
    query: GetJobApplicationsQueryDto,
  ): Promise<GetJobApplicationsResponse> {
    await this.findOwnedJob(recruiterId, jobId);

    const page = query.page ?? 1;
    const limit = query.limit ?? 10;

    const qb = this.appRepo
      .createQueryBuilder('app')
      .innerJoin('app.candidate', 'candidate')
      .leftJoin(MatchingResult, 'match', 'match.applicationId = app.id')
      .where('app.jobId = :jobId', { jobId })
      .select('app.id', 'applicationId')
      .addSelect('app.createdAt', 'appliedAt')
      .addSelect('app.updatedAt', 'updatedAt')
      .addSelect('app.status', 'status')
      .addSelect('candidate.id', 'candidateId')
      .addSelect('candidate.fullName', 'candidateFullName')
      .addSelect('candidate.email', 'candidateEmail')
      .addSelect('candidate.phone', 'candidatePhone')
      .addSelect('candidate.avatarUrl', 'candidateAvatarUrl')
      .addSelect('match.overallScore', 'overallScore')
      .addSelect('match.recommendation', 'recommendation')
      .addSelect('match.criteria', 'criteria')
      .addSelect('match.explanation', 'explanation');

    if (query.scoreBand) {
      const range = SCORE_BAND_RANGES[query.scoreBand];
      qb.andWhere('match.overallScore >= :min', { min: range.min });
      if (range.max !== null) {
        qb.andWhere('match.overallScore < :max', { max: range.max });
      }
    }

    if (query.sort === 'date') {
      qb.orderBy('app.createdAt', 'DESC');
    } else {
      qb.orderBy('match.overallScore', 'DESC', 'NULLS LAST').addOrderBy(
        'app.createdAt',
        'DESC',
      );
    }

    const total = await qb.getCount();
    const rows = await qb
      .offset((page - 1) * limit)
      .limit(limit)
      .getRawMany<ApplicationRow>();

    return {
      data: rows.map((row) => this.toResponseItem(row)),
      meta: {
        total,
        page,
        limit,
        totalPages: limit > 0 ? Math.ceil(total / limit) : 0,
      },
    };
  }

  async updateStatus(
    recruiterId: string,
    jobId: string,
    applicationId: string,
    dto: UpdateApplicationStatusDto,
  ): Promise<Application> {
    await this.findOwnedJob(recruiterId, jobId);

    const application = await this.appRepo.findOne({
      where: { id: applicationId, jobId },
      relations: ['candidate', 'job'],
    });
    if (!application) {
      throw new NotFoundException('Không tìm thấy đơn ứng tuyển');
    }

    const fromStatus = application.status;
    const toStatus = dto.status;
    if (!VALID_TRANSITIONS[fromStatus].includes(toStatus)) {
      throw new BadRequestException(
        `Không thể chuyển trạng thái từ "${fromStatus}" sang "${toStatus}"`,
      );
    }

    application.status = toStatus;
    const saved = await this.appRepo.save(application);

    await this.historyRepo.save(
      this.historyRepo.create({
        applicationId: saved.id,
        fromStatus,
        toStatus,
        changedBy: recruiterId,
      }),
    );

    if (EMAIL_NOTIFY_STATUSES.includes(toStatus)) {
      await this.sendStatusEmail(application, toStatus);
    }

    return saved;
  }

  private async sendStatusEmail(
    application: Application,
    status: ApplicationStatus,
  ): Promise<void> {
    const { email, fullName } = application.candidate;
    const jobTitle = application.job.title;

    if (status === 'interviewed') {
      await this.mailService.sendInterviewInviteEmail(
        email,
        fullName,
        jobTitle,
      );
    } else if (status === 'rejected') {
      await this.mailService.sendApplicationRejectedEmail(
        email,
        fullName,
        jobTitle,
      );
    }
  }

  private async findOwnedJob(recruiterId: string, jobId: string): Promise<Job> {
    const job = await this.jobRepo.findOne({ where: { id: jobId } });
    if (!job) {
      throw new NotFoundException('Không tìm thấy tin tuyển dụng');
    }
    if (job.recruiterId !== recruiterId) {
      throw new ForbiddenException(
        'Bạn không có quyền xem/quản lý đơn ứng tuyển của tin tuyển dụng này',
      );
    }
    return job;
  }

  private toResponseItem(row: ApplicationRow): JobApplicationListItem {
    const overallScore =
      row.overallScore !== null ? parseFloat(row.overallScore) : null;

    return {
      applicationId: row.applicationId,
      appliedAt: new Date(row.appliedAt).toISOString(),
      updatedAt: new Date(row.updatedAt).toISOString(),
      status: row.status,
      candidate: {
        id: row.candidateId,
        fullName: row.candidateFullName,
        email: row.candidateEmail,
        phone: row.candidatePhone,
        avatarUrl: row.candidateAvatarUrl,
      },
      matching:
        overallScore !== null || row.recommendation !== null
          ? {
              overallScore,
              recommendation: row.recommendation,
              criteria: row.criteria,
              explanation: row.explanation,
            }
          : null,
    };
  }
}
