import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Application, ApplicationStatus } from '../applications/application.entity'
import { MatchingResult, MatchRecommendation } from '../applications/matching-result.entity'
import { InterviewSession, InterviewSessionStatus } from '../applications/interview-session.entity'
import { Schedule, ScheduleStatus } from '../applications/schedule.entity'
import { ApplicationStatusHistory } from '../applications/application-status-history.entity'
import { GetMyApplicationsQueryDto } from './dto/get-my-applications-query.dto'
import { APPLICATION_STATUS_LABELS } from './application-status-label'

const AUTO_REJECT_SCORE_THRESHOLD = 30

interface ApplicationRow {
  applicationId: string
  appliedAt: Date
  updatedAt: Date
  status: ApplicationStatus
  jobId: string
  jobTitle: string
  jobDepartment: string | null
  jobLevel: string | null
  jobLocation: string | null
  jobWorkModel: string | null
  jobSalaryRange: string | null
  companyName: string | null
  companyLogoUrl: string | null
  overallScore: string | null
  recommendation: MatchRecommendation | null
  interviewStatus: InterviewSessionStatus | null
  interviewOverallScore: string | null
  scheduleStatus: ScheduleStatus | null
  scheduleConfirmedStartTime: Date | null
  scheduleMeetLink: string | null
}

export interface MyApplicationListItem {
  applicationId: string
  appliedAt: string
  updatedAt: string
  status: ApplicationStatus
  job: {
    id: string
    title: string
    department: string | null
    level: string | null
    location: string | null
    workModel: string | null
    salaryRange: string | null
    company: { name: string; logoUrl: string | null } | null
  }
  matching: { overallScore: number | null; recommendation: MatchRecommendation | null } | null
  interview: { status: InterviewSessionStatus | null; overallScore: number | null } | null
  schedule: {
    status: ScheduleStatus | null
    confirmedStartTime: string | null
    meetLink: string | null
  } | null
  autoRejected?: true
}

export interface StatusHistoryItem {
  fromStatus: ApplicationStatus | null
  toStatus: ApplicationStatus
  changedAt: string
  label: string
}

export interface MyApplicationDetail extends MyApplicationListItem {
  statusHistory: StatusHistoryItem[]
}

export interface GetMyApplicationsResponse {
  data: MyApplicationListItem[]
  meta: {
    total: number
    page: number
    limit: number
    totalPages: number
  }
}

@Injectable()
export class CandidateApplicationsService {
  constructor(
    @InjectRepository(Application)
    private readonly appRepo: Repository<Application>,
    @InjectRepository(ApplicationStatusHistory)
    private readonly historyRepo: Repository<ApplicationStatusHistory>,
  ) {}

  async getMyApplications(
    candidateId: string,
    query: GetMyApplicationsQueryDto,
  ): Promise<GetMyApplicationsResponse> {
    const page = query.page ?? 1
    const limit = query.limit ?? 10

    const qb = this.buildBaseQuery(candidateId)

    if (query.status) {
      qb.andWhere('app.status = :status', { status: query.status })
    }

    qb.orderBy('app.createdAt', 'DESC')

    const total = await qb.getCount()
    const rows = await qb
      .offset((page - 1) * limit)
      .limit(limit)
      .getRawMany<ApplicationRow>()

    return {
      data: rows.map((row) => this.toResponseItem(row)),
      meta: {
        total,
        page,
        limit,
        totalPages: limit > 0 ? Math.ceil(total / limit) : 0,
      },
    }
  }

  async getApplicationDetail(candidateId: string, applicationId: string): Promise<MyApplicationDetail> {
    const row = await this.buildBaseQuery(candidateId)
      .andWhere('app.id = :applicationId', { applicationId })
      .getRawOne<ApplicationRow>()

    if (!row) {
      throw new NotFoundException('Không tìm thấy đơn ứng tuyển')
    }

    const history = await this.historyRepo.find({
      where: { applicationId },
      order: { changedAt: 'ASC' },
    })

    return {
      ...this.toResponseItem(row),
      statusHistory: history.map((h) => ({
        fromStatus: h.fromStatus,
        toStatus: h.toStatus,
        changedAt: h.changedAt.toISOString(),
        label: APPLICATION_STATUS_LABELS[h.toStatus],
      })),
    }
  }

  private buildBaseQuery(candidateId: string) {
    return this.appRepo
      .createQueryBuilder('app')
      .innerJoin('app.job', 'job')
      .leftJoin('job.company', 'company')
      .leftJoin(MatchingResult, 'match', 'match.applicationId = app.id')
      .leftJoin(InterviewSession, 'interview', 'interview.applicationId = app.id')
      .leftJoin(Schedule, 'schedule', 'schedule.applicationId = app.id')
      .where('app.candidateId = :candidateId', { candidateId })
      .select('app.id', 'applicationId')
      .addSelect('app.createdAt', 'appliedAt')
      .addSelect('app.updatedAt', 'updatedAt')
      .addSelect('app.status', 'status')
      .addSelect('job.id', 'jobId')
      .addSelect('job.title', 'jobTitle')
      .addSelect('job.department', 'jobDepartment')
      .addSelect('job.level', 'jobLevel')
      .addSelect('job.location', 'jobLocation')
      .addSelect('job.workModel', 'jobWorkModel')
      .addSelect('job.salaryRange', 'jobSalaryRange')
      .addSelect('company.name', 'companyName')
      .addSelect('company.logoUrl', 'companyLogoUrl')
      .addSelect('match.overallScore', 'overallScore')
      .addSelect('match.recommendation', 'recommendation')
      .addSelect('interview.status', 'interviewStatus')
      .addSelect('interview.overallScore', 'interviewOverallScore')
      .addSelect('schedule.status', 'scheduleStatus')
      .addSelect('schedule.confirmedStartTime', 'scheduleConfirmedStartTime')
      .addSelect('schedule.meetLink', 'scheduleMeetLink')
  }

  private toResponseItem(row: ApplicationRow): MyApplicationListItem {
    const overallScore = row.overallScore !== null ? parseFloat(row.overallScore) : null

    const item: MyApplicationListItem = {
      applicationId: row.applicationId,
      appliedAt: new Date(row.appliedAt).toISOString(),
      updatedAt: new Date(row.updatedAt).toISOString(),
      status: row.status,
      job: {
        id: row.jobId,
        title: row.jobTitle,
        department: row.jobDepartment,
        level: row.jobLevel,
        location: row.jobLocation,
        workModel: row.jobWorkModel,
        salaryRange: row.jobSalaryRange,
        company: row.companyName ? { name: row.companyName, logoUrl: row.companyLogoUrl } : null,
      },
      matching:
        overallScore !== null || row.recommendation !== null
          ? { overallScore, recommendation: row.recommendation }
          : null,
      interview:
        row.interviewStatus !== null
          ? {
              status: row.interviewStatus,
              overallScore: row.interviewOverallScore !== null ? parseFloat(row.interviewOverallScore) : null,
            }
          : null,
      schedule:
        row.scheduleStatus !== null
          ? {
              status: row.scheduleStatus,
              confirmedStartTime: row.scheduleConfirmedStartTime
                ? new Date(row.scheduleConfirmedStartTime).toISOString()
                : null,
              meetLink: row.scheduleMeetLink,
            }
          : null,
    }

    if (row.status === 'rejected' && overallScore !== null && overallScore < AUTO_REJECT_SCORE_THRESHOLD) {
      item.autoRejected = true
    }

    return item
  }
}
