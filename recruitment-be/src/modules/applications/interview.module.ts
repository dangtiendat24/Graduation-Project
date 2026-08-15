import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { HttpModule } from '@nestjs/axios';
import { QUEUE_NAMES } from '@smart-recruitment/shared';
import { Application } from './application.entity';
import { ApplicationStatusHistory } from './application-status-history.entity';
import { InterviewSession } from './interview-session.entity';
import { InterviewAnswer } from './interview-answer.entity';
import { InterviewSessionService } from './interview-session.service';
import { InterviewSessionController } from './interview-session.controller';
import { InterviewScoringService } from './interview-scoring.service';
import { InterviewScoringProcessor } from './interview-scoring.processor';
import { InterviewGenerationService } from './interview-generation.service';
import { InterviewGenerationProcessor } from './interview-generation.processor';
import { VoiceInterviewService } from './voice-interview.service';
import { VoiceInterviewController } from './voice-interview.controller';
import { AdminModule } from '../admin/admin.module';
import { DashboardModule } from '../dashboard/dashboard.module';
import { StorageModule } from '../storage/storage.module';

/**
 * Module riêng cho pipeline phỏng vấn AI (Agent 3) — tách khỏi ApplicationsModule để
 * MatchingModule có thể import và tự trigger sinh câu hỏi ngay khi application chuyển
 * sang "matched", mà không tạo circular dependency (ApplicationsModule đã import
 * MatchingModule để enqueue matching sau khi parse CV xong).
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      Application,
      ApplicationStatusHistory,
      InterviewSession,
      InterviewAnswer,
    ]),
    BullModule.registerQueue(
      { name: QUEUE_NAMES.INTERVIEW },
      { name: QUEUE_NAMES.INTERVIEW_SCORING },
    ),
    HttpModule.register({ timeout: 20000, maxRedirects: 3 }),
    AdminModule,
    DashboardModule,
    StorageModule,
  ],
  controllers: [InterviewSessionController, VoiceInterviewController],
  providers: [
    InterviewSessionService,
    InterviewScoringService,
    InterviewScoringProcessor,
    InterviewGenerationService,
    InterviewGenerationProcessor,
    VoiceInterviewService,
  ],
  exports: [InterviewGenerationService],
})
export class InterviewModule {}
