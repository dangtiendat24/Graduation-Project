import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { HttpModule } from '@nestjs/axios';
import { QUEUE_NAMES } from '@smart-recruitment/shared';
import { Application } from '../applications/application.entity';
import { ApplicationStatusHistory } from '../applications/application-status-history.entity';
import { MatchingResult } from '../applications/matching-result.entity';
import { InterviewModule } from '../applications/interview.module';
import { DashboardModule } from '../dashboard/dashboard.module';
import { MatchingService } from './matching.service';
import { MatchingProcessor } from './matching.processor';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Application,
      ApplicationStatusHistory,
      MatchingResult,
    ]),
    BullModule.registerQueue({ name: QUEUE_NAMES.CV_MATCHING }),
    HttpModule,
    InterviewModule,
    DashboardModule,
  ],
  providers: [MatchingService, MatchingProcessor],
  exports: [MatchingService],
})
export class MatchingModule {}
