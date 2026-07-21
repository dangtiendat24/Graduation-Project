import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { HttpService } from '@nestjs/axios';
import { Repository } from 'typeorm';
import { Job as BullJob } from 'bullmq';
import { firstValueFrom } from 'rxjs';
import {
  QUEUE_NAMES,
  AUTO_REJECT_THRESHOLD,
  VALID_TRANSITIONS,
  resolveMatchingWeights,
} from '@smart-recruitment/shared';
import {
  Application,
  ApplicationStatus,
} from '../applications/application.entity';
import { ApplicationStatusHistory } from '../applications/application-status-history.entity';
import {
  MatchingResult,
  MatchingCriteria,
  MatchRecommendation,
} from '../applications/matching-result.entity';
import { Job as JobEntity } from '../jobs/job.entity';
import { CvMatchJobData } from './matching.service';

/** Shape thô trả về từ ai-service (Python/Pydantic dùng snake_case, kể cả nested skill_breakdown) */
interface AiMatchResponse {
  application_id: string;
  overall_score: number;
  criteria: {
    skills: number;
    experience: number;
    education: number;
    skill_breakdown?: { keyword: number; tfidf: number; semantic: number };
  };
  qdrant_similarity: number | null;
  explanation: string;
  recommendation: MatchRecommendation;
  success: boolean;
  error: string | null;
}

@Processor(QUEUE_NAMES.CV_MATCHING)
export class MatchingProcessor extends WorkerHost {
  private readonly logger = new Logger(MatchingProcessor.name);

  constructor(
    @InjectRepository(Application)
    private readonly appRepo: Repository<Application>,
    @InjectRepository(MatchingResult)
    private readonly matchRepo: Repository<MatchingResult>,
    @InjectRepository(ApplicationStatusHistory)
    private readonly historyRepo: Repository<ApplicationStatusHistory>,
    private readonly httpService: HttpService,
    private readonly config: ConfigService,
  ) {
    super();
  }

  async process(job: BullJob<CvMatchJobData>): Promise<void> {
    const application = await this.appRepo.findOne({
      where: { id: job.data.applicationId },
      relations: ['job'],
    });
    if (!application) return;

    if (application.parseStatus !== 'done' || !application.isAnalyzed) {
      this.logger.warn(
        `CV nộp cho application ${application.id} chưa parse xong (status=${application.parseStatus}), bỏ qua matching`,
      );
      return;
    }

    const aiServiceUrl = this.config.get<string>(
      'AI_SERVICE_URL',
      'http://localhost:8000',
    );
    const { data } = await firstValueFrom(
      this.httpService.post<AiMatchResponse>(
        `${aiServiceUrl}/api/ai/matching/match`,
        {
          application_id: application.id,
          profile_id: application.id,
          job_id: application.jobId,
          cv_text: this.buildCvText(application),
          job_text: this.buildJobText(application.job),
          cv_skills: application.parsedSkills ?? [],
          job_skills: application.job.requiredSkills ?? [],
          weights: resolveMatchingWeights(application.job.scoringWeights),
        },
      ),
    );

    if (!data.success) {
      throw new Error(data.error ?? 'AI service trả về lỗi không xác định');
    }

    let result = await this.matchRepo.findOne({
      where: { applicationId: application.id },
    });
    if (!result) {
      result = this.matchRepo.create({ applicationId: application.id });
    }
    result.overallScore = data.overall_score;
    result.recommendation = data.recommendation;
    result.criteria = this.toPersistedCriteria(data.criteria);
    result.explanation = data.explanation;
    await this.matchRepo.save(result);

    await this.transitionApplication(application, data.overall_score);
  }

  private async transitionApplication(
    application: Application,
    overallScore: number,
  ): Promise<void> {
    const nextStatus: ApplicationStatus =
      overallScore < AUTO_REJECT_THRESHOLD ? 'rejected' : 'matched';

    if (!VALID_TRANSITIONS[application.status].includes(nextStatus)) return;

    const fromStatus = application.status;
    application.status = nextStatus;
    await this.appRepo.save(application);

    await this.historyRepo.save(
      this.historyRepo.create({
        applicationId: application.id,
        fromStatus,
        toStatus: nextStatus,
        changedBy: null,
        metadata: { source: 'agent2_matching', overallScore },
      }),
    );
  }

  /** ai-service trả wire format snake_case — chuẩn hoá sang camelCase trước khi lưu/hiển thị cho FE */
  private toPersistedCriteria(criteria: AiMatchResponse['criteria']): MatchingCriteria {
    return {
      skills: criteria.skills,
      experience: criteria.experience,
      education: criteria.education,
      skillBreakdown: criteria.skill_breakdown,
    };
  }

  private buildCvText(application: Application): string {
    const experienceLines = (application.parsedExperience ?? []).map(
      (e) => `${e.title} tại ${e.company} (${e.period}): ${e.description}`,
    );
    const educationLines = (application.parsedEducation ?? []).map(
      (e) => `${e.degree} - ${e.school} (${e.year})`,
    );
    return [
      application.parsedSummary,
      ...(application.parsedSkills ?? []),
      ...experienceLines,
      ...educationLines,
    ]
      .filter(Boolean)
      .join('\n');
  }

  private buildJobText(job: JobEntity): string {
    return [
      job.title,
      job.description,
      job.requirements,
      ...(job.requiredSkills ?? []),
    ]
      .filter(Boolean)
      .join('\n');
  }
}
