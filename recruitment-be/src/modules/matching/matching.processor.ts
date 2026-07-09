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
import { CandidateResume } from '../profile/entities/candidate-resume.entity';
import { CvMatchJobData } from './matching.service';

interface AiMatchResponse {
  application_id: string;
  overall_score: number;
  criteria: MatchingCriteria;
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
    @InjectRepository(CandidateResume)
    private readonly resumeRepo: Repository<CandidateResume>,
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

    const resume = await this.resumeRepo.findOne({
      where: { candidateId: application.candidateId },
    });
    if (!resume) {
      this.logger.warn(
        `Không tìm thấy CV đã parse cho candidate ${application.candidateId}, bỏ qua matching`,
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
          profile_id: application.candidateId,
          job_id: application.jobId,
          cv_text: this.buildCvText(resume),
          job_text: this.buildJobText(application.job),
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
    result.criteria = data.criteria;
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

  private buildCvText(resume: CandidateResume): string {
    const experienceLines = (resume.parsedExperience ?? []).map(
      (e) => `${e.title} tại ${e.company} (${e.period}): ${e.description}`,
    );
    const educationLines = (resume.parsedEducation ?? []).map(
      (e) => `${e.degree} - ${e.school} (${e.year})`,
    );
    return [
      resume.parsedSummary,
      ...(resume.parsedSkills ?? []),
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
