import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Application, ApplicationStatus } from '../applications/application.entity'
import { MatchingResult, MatchingCriteria, MatchRecommendation } from '../applications/matching-result.entity'
import { ExperienceItem, EduItem } from '../profile/entities/candidate-resume.entity'
import { StorageService } from '../storage/storage.service'
import { GetCandidatesQueryDto } from './dto/get-candidates-query.dto'

const CV_URL_EXPIRY_SECONDS = 300

interface CandidateRow {
  applicationId: string
  appliedAt: Date
  status: ApplicationStatus
  cvUrl: string | null
  candidateId: string
  candidateFullName: string
  candidateEmail: string
  candidatePhone: string | null
  candidateAvatarUrl: string | null
  candidateCity: string | null
  candidateLinkedinUrl: string | null
  candidateGithubUrl: string | null
  isParsed: boolean | null
  parsedSummary: string | null
  parsedSkills: string[] | null
  parsedExperience: ExperienceItem[] | null
  parsedEducation: EduItem[] | null
  overallScore: string | null
  recommendation: MatchRecommendation | null
  criteria: MatchingCriteria | null
  jobId: string
  jobTitle: string
  jobDepartment: string | null
}

export interface CandidateListItem {
  applicationId: string
  appliedAt: string
  status: ApplicationStatus
  candidate: {
    id: string
    fullName: string
    email: string
    phone: string | null
    avatarUrl: string | null
    city: string | null
    linkedinUrl: string | null
    githubUrl: string | null
  }
  parsedData: {
    summary: string | null
    skills: string[]
    experience: ExperienceItem[]
    education: EduItem[]
  } | null
  isParsed: boolean
  cvFileUrl: string | null
  matching: {
    overallScore: number
    recommendation: MatchRecommendation
    criteria: MatchingCriteria
  } | null
  job: {
    id: string
    title: string
    department: string | null
  }
}

export interface GetCandidatesResponse {
  data: CandidateListItem[]
  meta: {
    total: number
    page: number
    limit: number
    totalPages: number
  }
}

@Injectable()
export class CandidatesService {
  constructor(
    @InjectRepository(Application)
    private readonly appRepo: Repository<Application>,
    private readonly storage: StorageService,
  ) {}

  async getCandidatesByRecruiter(
    recruiterId: string,
    query: GetCandidatesQueryDto,
  ): Promise<GetCandidatesResponse> {
    const page = query.page ?? 1
    const limit = query.limit ?? 20

    const qb = this.appRepo
      .createQueryBuilder('app')
      .innerJoin('app.job', 'job')
      .innerJoin('app.candidate', 'user')
      .leftJoin(MatchingResult, 'match', 'match.applicationId = app.id')
      .where('job.recruiterId = :recruiterId', { recruiterId })
      .select('app.id', 'applicationId')
      .addSelect('app.createdAt', 'appliedAt')
      .addSelect('app.status', 'status')
      .addSelect('app.cvUrl', 'cvUrl')
      .addSelect('user.id', 'candidateId')
      .addSelect('user.fullName', 'candidateFullName')
      .addSelect('user.email', 'candidateEmail')
      .addSelect('user.phone', 'candidatePhone')
      .addSelect('user.avatarUrl', 'candidateAvatarUrl')
      .addSelect('user.city', 'candidateCity')
      .addSelect('user.linkedin', 'candidateLinkedinUrl')
      .addSelect('user.github', 'candidateGithubUrl')
      .addSelect('app.isAnalyzed', 'isParsed')
      .addSelect('app.parsedSummary', 'parsedSummary')
      .addSelect('app.parsedSkills', 'parsedSkills')
      .addSelect('app.parsedExperience', 'parsedExperience')
      .addSelect('app.parsedEducation', 'parsedEducation')
      .addSelect('match.overallScore', 'overallScore')
      .addSelect('match.recommendation', 'recommendation')
      .addSelect('match.criteria', 'criteria')
      .addSelect('job.id', 'jobId')
      .addSelect('job.title', 'jobTitle')
      .addSelect('job.department', 'jobDepartment')

    if (query.jobId) {
      qb.andWhere('app.jobId = :jobId', { jobId: query.jobId })
    }
    if (query.status) {
      qb.andWhere('app.status = :status', { status: query.status })
    }
    if (query.search) {
      qb.andWhere('(user.fullName ILIKE :search OR user.email ILIKE :search)', {
        search: `%${query.search}%`,
      })
    }

    if (query.sort === 'overallScore') {
      qb.orderBy('match.overallScore', 'DESC', 'NULLS LAST')
    } else {
      qb.orderBy('app.createdAt', 'DESC')
    }

    const total = await qb.getCount()
    const rows = await qb
      .offset((page - 1) * limit)
      .limit(limit)
      .getRawMany<CandidateRow>()

    const data = await Promise.all(rows.map((row) => this.toResponseItem(row)))

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: limit > 0 ? Math.ceil(total / limit) : 0,
      },
    }
  }

  private async toResponseItem(row: CandidateRow): Promise<CandidateListItem> {
    const isParsed = row.isParsed ?? false

    const cvFileUrl = row.cvUrl
      ? await this.storage.getPresignedUrlForStoredUrl(row.cvUrl, CV_URL_EXPIRY_SECONDS)
      : null

    return {
      applicationId: row.applicationId,
      appliedAt: new Date(row.appliedAt).toISOString(),
      status: row.status,
      candidate: {
        id: row.candidateId,
        fullName: row.candidateFullName,
        email: row.candidateEmail,
        phone: row.candidatePhone,
        avatarUrl: row.candidateAvatarUrl,
        city: row.candidateCity,
        linkedinUrl: row.candidateLinkedinUrl,
        githubUrl: row.candidateGithubUrl,
      },
      parsedData: isParsed
        ? {
            summary: row.parsedSummary,
            skills: row.parsedSkills ?? [],
            experience: row.parsedExperience ?? [],
            education: row.parsedEducation ?? [],
          }
        : null,
      isParsed,
      cvFileUrl,
      matching:
        row.overallScore !== null
          ? {
              overallScore: parseFloat(row.overallScore),
              recommendation: row.recommendation as MatchRecommendation,
              criteria: row.criteria as MatchingCriteria,
            }
          : null,
      job: {
        id: row.jobId,
        title: row.jobTitle,
        department: row.jobDepartment,
      },
    }
  }
}
