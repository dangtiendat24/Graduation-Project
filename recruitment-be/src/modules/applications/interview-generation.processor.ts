import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { HttpService } from '@nestjs/axios';
import { Repository } from 'typeorm';
import { Job as BullJob } from 'bullmq';
import { firstValueFrom } from 'rxjs';
import { QUEUE_NAMES } from '@smart-recruitment/shared';
import { Application } from './application.entity';
import { Job as JobEntity } from '../jobs/job.entity';
import {
  GeneratedQuestionItem,
  InterviewSession,
} from './interview-session.entity';
import { InterviewSessionService } from './interview-session.service';
import { InterviewGenerationJobData } from './interview-generation.service';

interface AiGenerateQuestionsResponse {
  session_id: string;
  questions: GeneratedQuestionItem[];
  success: boolean;
  error: string | null;
}

@Processor(QUEUE_NAMES.INTERVIEW)
export class InterviewGenerationProcessor extends WorkerHost {
  private readonly logger = new Logger(InterviewGenerationProcessor.name);

  constructor(
    @InjectRepository(Application)
    private readonly appRepo: Repository<Application>,
    @InjectRepository(InterviewSession)
    private readonly sessionRepo: Repository<InterviewSession>,
    private readonly sessionService: InterviewSessionService,
    private readonly httpService: HttpService,
    private readonly config: ConfigService,
  ) {
    super();
  }

  async process(job: BullJob<InterviewGenerationJobData>): Promise<void> {
    const application = await this.appRepo.findOne({
      where: { id: job.data.applicationId },
      relations: ['job'],
    });
    if (!application) return;

    const session = await this.sessionService.getOrCreateForApplication(
      application.id,
    );
    if (session.questionsStatus === 'done') {
      return;
    }

    session.questionsStatus = 'processing';
    await this.sessionRepo.save(session);

    const aiServiceUrl = this.config.get<string>(
      'AI_SERVICE_URL',
      'http://localhost:8000',
    );

    try {
      const { data } = await firstValueFrom(
        this.httpService.post<AiGenerateQuestionsResponse>(
          `${aiServiceUrl}/api/ai/interview/generate-questions`,
          {
            session_id: session.id,
            application_id: application.id,
            parsed_data: this.buildParsedData(application),
            job_requirements: this.buildJobRequirements(application.job),
          },
          {
            headers: {
              'x-internal-secret': this.config.get<string>(
                'AI_SERVICE_INTERNAL_SECRET',
                '',
              ),
            },
          },
        ),
      );

      if (!data.success) {
        throw new Error(data.error ?? 'AI service trả về lỗi không xác định');
      }

      session.questions = data.questions;
      session.questionsStatus = 'done';
      session.questionsError = null;
      await this.sessionRepo.save(session);
    } catch (err) {
      session.questionsStatus = 'error';
      session.questionsError = (err as Error).message;
      await this.sessionRepo.save(session);
      this.logger.error(
        `Sinh câu hỏi phỏng vấn thất bại cho application ${application.id}: ${(err as Error).message}`,
      );
      throw err;
    }
  }

  private buildParsedData(application: Application): Record<string, unknown> {
    return {
      summary: application.parsedSummary,
      skills: application.parsedSkills ?? [],
      experience: application.parsedExperience ?? [],
      education: application.parsedEducation ?? [],
    };
  }

  private buildJobRequirements(job: JobEntity): string {
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
