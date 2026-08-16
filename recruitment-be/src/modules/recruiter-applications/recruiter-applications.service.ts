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
import {
  InterviewSession,
  InterviewSessionStatus,
  InterviewPipelineStatus,
} from '../applications/interview-session.entity';
import { InterviewAnswer } from '../applications/interview-answer.entity';
import { Job } from '../jobs/job.entity';
import { MailService } from '../mail/mail.service';
import { DashboardCacheService } from '../dashboard/dashboard-cache.service';
import { StorageService } from '../storage/storage.service';
import { NotificationsService } from '../notifications/notifications.service';
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
const EMAIL_NOTIFY_STATUSES: ApplicationStatus[] = [
  'interviewed',
  'rejected',
  'hired',
];

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
  interviewSessionId: string | null;
  interviewStatus: InterviewSessionStatus | null;
  interviewScoringStatus: InterviewPipelineStatus | null;
  interviewOverallScore: string | null;
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
  interview: {
    sessionId: string;
    status: InterviewSessionStatus;
    scoringStatus: InterviewPipelineStatus;
    overallScore: number | null;
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
    @InjectRepository(InterviewSession)
    private readonly interviewSessionRepo: Repository<InterviewSession>,
    @InjectRepository(InterviewAnswer)
    private readonly interviewAnswerRepo: Repository<InterviewAnswer>,
    private readonly mailService: MailService,
    private readonly dashboardCache: DashboardCacheService,
    private readonly storage: StorageService,
    private readonly notificationsService: NotificationsService,
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
      .leftJoin(
        InterviewSession,
        'interview',
        'interview.applicationId = app.id',
      )
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
      .addSelect('match.explanation', 'explanation')
      .addSelect('interview.id', 'interviewSessionId')
      .addSelect('interview.status', 'interviewStatus')
      .addSelect('interview.scoringStatus', 'interviewScoringStatus')
      .addSelect('interview.overallScore', 'interviewOverallScore');

    if (query.scoreBand) {
      const range = SCORE_BAND_RANGES[query.scoreBand];
      qb.andWhere('match.overallScore >= :min', { min: range.min });
      if (range.max !== null) {
        qb.andWhere('match.overallScore < :max', { max: range.max });
      }
    }

    if (query.status) {
      qb.andWhere('app.status = :status', { status: query.status });
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

    await this.dashboardCache.invalidate(recruiterId);

    if (EMAIL_NOTIFY_STATUSES.includes(toStatus)) {
      await this.notifyCandidateStatusChange(application, toStatus);
    }

    return saved;
  }

  async getInterviewResult(
    recruiterId: string,
    jobId: string,
    applicationId: string,
  ) {
    await this.findOwnedJob(recruiterId, jobId);

    const application = await this.appRepo.findOne({
      where: { id: applicationId, jobId },
    });
    if (!application) {
      throw new NotFoundException('Không tìm thấy đơn ứng tuyển');
    }

    const session = await this.interviewSessionRepo.findOne({
      where: { applicationId },
    });
    if (!session) {
      throw new NotFoundException(
        'Ứng viên chưa có buổi phỏng vấn AI nào cho đơn ứng tuyển này',
      );
    }

    const answers = await this.interviewAnswerRepo.find({
      where: { sessionId: session.id },
    });

    return {
      sessionId: session.id,
      mode: session.mode,
      status: session.status,
      questionsStatus: session.questionsStatus,
      scoringStatus: session.scoringStatus,
      scoringError: session.scoringError,
      overallScore: session.overallScore,
      transcript: session.transcript,
      questions: session.questions,
      answers: await Promise.all(
        answers.map(async (a) => ({
          questionId: a.questionId,
          questionText: a.questionText,
          category: a.category,
          difficulty: a.difficulty,
          answerText: a.answerText,
          subScores: a.subScores,
          totalScore: a.totalScore,
          comment: a.comment,
          // audioUrl lưu trong DB là storage KEY, không phải URL công khai — chỉ voice interview có
          audioUrl: a.audioUrl
            ? await this.storage.getSignedUrl(a.audioUrl)
            : null,
          responseLatencyMs: a.responseLatencyMs,
          tabBlurCount: a.tabBlurCount,
          tabBlurTotalMs: a.tabBlurTotalMs,
        })),
      ),
    };
  }

  /**
   * Ghi thông báo trong-app + gửi email cho ứng viên khi đơn chuyển sang các trạng thái quan trọng.
   * Ghi thông báo trước email — nếu gửi email lỗi thì chuông thông báo vẫn phản ánh đúng sự kiện
   * đã xảy ra, không phụ thuộc vào email có gửi được hay không.
   */
  private async notifyCandidateStatusChange(
    application: Application,
    status: ApplicationStatus,
  ): Promise<void> {
    const { email, fullName } = application.candidate;
    const jobTitle = application.job.title;

    if (status === 'interviewed') {
      await this.notificationsService.create(
        application.candidateId,
        'interview_invite',
        'Mời phỏng vấn',
        `Bạn được mời phỏng vấn cho vị trí ${jobTitle}`,
        '/candidate/applications',
      );
      await this.mailService.sendInterviewInviteEmail(
        email,
        fullName,
        jobTitle,
      );
    } else if (status === 'rejected') {
      await this.notificationsService.create(
        application.candidateId,
        'application_rejected',
        'Kết quả ứng tuyển',
        `Đơn ứng tuyển vị trí ${jobTitle} chưa phù hợp lần này`,
        '/candidate/applications',
      );
      await this.mailService.sendApplicationRejectedEmail(
        email,
        fullName,
        jobTitle,
      );
    } else if (status === 'hired') {
      await this.notificationsService.create(
        application.candidateId,
        'application_hired',
        'Chúc mừng!',
        `Bạn đã được nhận vào vị trí ${jobTitle}`,
        '/candidate/applications',
      );
      await this.mailService.sendApplicationHiredEmail(
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
      interview: row.interviewSessionId
        ? {
            sessionId: row.interviewSessionId,
            status: row.interviewStatus!,
            scoringStatus: row.interviewScoringStatus!,
            overallScore:
              row.interviewOverallScore !== null
                ? parseFloat(row.interviewOverallScore)
                : null,
          }
        : null,
    };
  }
}
