import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SavedJob } from './saved-job.entity';
import { Job } from '../jobs/job.entity';
import { JobsModule } from '../jobs/jobs.module';
import { SavedJobsService } from './saved-jobs.service';
import { SavedJobsController } from './saved-jobs.controller';

@Module({
  imports: [TypeOrmModule.forFeature([SavedJob, Job]), JobsModule],
  controllers: [SavedJobsController],
  providers: [SavedJobsService],
})
export class SavedJobsModule {}
