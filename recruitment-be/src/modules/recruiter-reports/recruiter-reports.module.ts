import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Application } from '../applications/application.entity';
import { ApplicationStatusHistory } from '../applications/application-status-history.entity';
import { Job } from '../jobs/job.entity';
import { RecruiterReportsService } from './recruiter-reports.service';
import { RecruiterReportsController } from './recruiter-reports.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Application, ApplicationStatusHistory, Job]),
  ],
  controllers: [RecruiterReportsController],
  providers: [RecruiterReportsService],
})
export class RecruiterReportsModule {}
