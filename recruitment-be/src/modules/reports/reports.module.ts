import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Application } from '../applications/application.entity';
import { Job } from '../jobs/job.entity';
import { Company } from '../companies/company.entity';
import { MatchingResult } from '../applications/matching-result.entity';
import { InterviewSession } from '../applications/interview-session.entity';
import { InterviewAnswer } from '../applications/interview-answer.entity';
import { ApplicationStatusHistory } from '../applications/application-status-history.entity';
import { ReportCache } from './report-cache.entity';
import { StorageModule } from '../storage/storage.module';
import { ReportsService } from './reports.service';
import { ReportsController } from './reports.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Application,
      Job,
      Company,
      MatchingResult,
      InterviewSession,
      InterviewAnswer,
      ApplicationStatusHistory,
      ReportCache,
    ]),
    StorageModule,
  ],
  controllers: [ReportsController],
  providers: [ReportsService],
})
export class ReportsModule {}
