import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Application } from './application.entity';
import { ApplicationStatusHistory } from './application-status-history.entity';
import { Job } from '../jobs/job.entity';
import { StorageModule } from '../storage/storage.module';
import { MatchingModule } from '../matching/matching.module';
import { ApplicationsService } from './applications.service';
import { ApplicationsController } from './applications.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Application, ApplicationStatusHistory, Job]),
    StorageModule,
    MatchingModule,
  ],
  controllers: [ApplicationsController],
  providers: [ApplicationsService],
})
export class ApplicationsModule {}
