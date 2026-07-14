import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { HttpModule } from '@nestjs/axios';
import { QUEUE_NAMES } from '@smart-recruitment/shared';
import { Application } from '../applications/application.entity';
import { ApplicationStatusHistory } from '../applications/application-status-history.entity';
import { MatchingResult } from '../applications/matching-result.entity';
import { CandidateResume } from '../profile/entities/candidate-resume.entity';
import { MatchingService } from './matching.service';
import { MatchingProcessor } from './matching.processor';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Application,
      ApplicationStatusHistory,
      MatchingResult,
      CandidateResume,
    ]),
    BullModule.registerQueue({ name: QUEUE_NAMES.CV_MATCHING }),
    HttpModule,
  ],
  providers: [MatchingService, MatchingProcessor],
  exports: [MatchingService],
})
export class MatchingModule {}
