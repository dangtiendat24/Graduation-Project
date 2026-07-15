import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { HttpService } from '@nestjs/axios';
import { Repository } from 'typeorm';
import { Job } from 'bullmq';
import { firstValueFrom } from 'rxjs';
import { QUEUE_NAMES, ParsedCvSchema } from '@smart-recruitment/shared';
import { Application } from './application.entity';
import { StorageService } from '../storage/storage.service';
import { MatchingService } from '../matching/matching.service';
import { extractCvText } from '../resume-parser/utils/cv-text-extractor.util';
import { ApplicationCvParseJobData } from './application-cv-parser.service';

interface AiParseResumeResponse {
  profile_id: string;
  parsed_data: Record<string, unknown>;
  success: boolean;
  error: string | null;
}

@Processor(QUEUE_NAMES.APPLICATION_CV_PARSE)
export class ApplicationCvParserProcessor extends WorkerHost {
  private readonly logger = new Logger(ApplicationCvParserProcessor.name);

  constructor(
    @InjectRepository(Application)
    private readonly appRepo: Repository<Application>,
    private readonly storage: StorageService,
    private readonly matching: MatchingService,
    private readonly httpService: HttpService,
    private readonly config: ConfigService,
  ) {
    super();
  }

  async process(job: Job<ApplicationCvParseJobData>): Promise<void> {
    const application = await this.appRepo.findOne({
      where: { id: job.data.applicationId },
    });
    if (!application) return;

    application.parseStatus = 'processing';
    await this.appRepo.save(application);

    const aiServiceUrl = this.config.get<string>(
      'AI_SERVICE_URL',
      'http://localhost:8000',
    );

    try {
      const buffer = await this.storage.download(application.cvUrl);
      const cvRawText = await extractCvText(buffer, application.cvUrl);

      const { data } = await firstValueFrom(
        this.httpService.post<AiParseResumeResponse>(
          `${aiServiceUrl}/api/ai/resume-parser/parse`,
          { profile_id: application.id, cv_raw_text: cvRawText },
        ),
      );

      if (!data.success) {
        throw new Error(data.error ?? 'AI service trả về lỗi không xác định');
      }

      const parsed = ParsedCvSchema.parse(data.parsed_data);

      application.parsedSummary = parsed.summary;
      application.parsedSkills = parsed.skills;
      application.parsedExperience = parsed.experience;
      application.parsedEducation = parsed.education;
      application.isAnalyzed = true;
      application.parseStatus = 'done';
      application.parsedAt = new Date();
      await this.appRepo.save(application);

      await this.embedCv(aiServiceUrl, application.id, cvRawText);
      await this.matching.enqueueMatch(application.id);
    } catch (err) {
      application.isAnalyzed = false;
      application.parseStatus = 'error';
      await this.appRepo.save(application);
      this.logger.error(
        `Parse CV thất bại cho application ${application.id}: ${(err as Error).message}`,
      );
      throw err;
    }
  }

  private async embedCv(
    aiServiceUrl: string,
    applicationId: string,
    cvText: string,
  ): Promise<void> {
    try {
      await firstValueFrom(
        this.httpService.post(`${aiServiceUrl}/api/ai/matching/embeddings/cv`, {
          profile_id: applicationId,
          cv_text: cvText,
        }),
      );
    } catch (err) {
      this.logger.warn(
        `Lưu embedding CV thất bại cho application ${applicationId}: ${(err as Error).message}`,
      );
    }
  }
}
