import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { HttpModule } from '@nestjs/axios';
import { QUEUE_NAMES } from '@smart-recruitment/shared';
import { Application } from './application.entity';
import { ApplicationStatusHistory } from './application-status-history.entity';
import { InterviewSession } from './interview-session.entity';
import { InterviewAnswer } from './interview-answer.entity';
import { Job } from '../jobs/job.entity';
import { StorageModule } from '../storage/storage.module';
import { MatchingModule } from '../matching/matching.module';
import { ApplicationsService } from './applications.service';
import { ApplicationsController } from './applications.controller';
import { ApplicationCvParserService } from './application-cv-parser.service';
import { ApplicationCvParserProcessor } from './application-cv-parser.processor';
import { InterviewSessionService } from './interview-session.service';
import { InterviewSessionController } from './interview-session.controller';
import { InterviewScoringService } from './interview-scoring.service';
import { InterviewScoringProcessor } from './interview-scoring.processor';
import { InterviewGenerationService } from './interview-generation.service';
import { InterviewGenerationProcessor } from './interview-generation.processor';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Application,
      ApplicationStatusHistory,
      InterviewSession,
      InterviewAnswer,
      Job,
    ]),
    BullModule.registerQueue(
      { name: QUEUE_NAMES.APPLICATION_CV_PARSE },
      { name: QUEUE_NAMES.INTERVIEW },
      { name: QUEUE_NAMES.INTERVIEW_SCORING },
    ),
    HttpModule.register({ timeout: 20000, maxRedirects: 3 }),
    StorageModule,
    MatchingModule,
  ],
  controllers: [ApplicationsController, InterviewSessionController],
  providers: [
    ApplicationsService,
    ApplicationCvParserService,
    ApplicationCvParserProcessor,
    InterviewSessionService,
    InterviewScoringService,
    InterviewScoringProcessor,
    InterviewGenerationService,
    InterviewGenerationProcessor,
  ],
  exports: [InterviewGenerationService],
})
export class ApplicationsModule {}
