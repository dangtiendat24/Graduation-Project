import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { HttpModule } from '@nestjs/axios';
import { QUEUE_NAMES } from '@smart-recruitment/shared';
import { Application } from './application.entity';
import { ApplicationStatusHistory } from './application-status-history.entity';
import { Job } from '../jobs/job.entity';
import { StorageModule } from '../storage/storage.module';
import { MatchingModule } from '../matching/matching.module';
import { ApplicationsService } from './applications.service';
import { ApplicationsController } from './applications.controller';
import { ApplicationCvParserService } from './application-cv-parser.service';
import { ApplicationCvParserProcessor } from './application-cv-parser.processor';

@Module({
  imports: [
    TypeOrmModule.forFeature([Application, ApplicationStatusHistory, Job]),
    BullModule.registerQueue({ name: QUEUE_NAMES.APPLICATION_CV_PARSE }),
    HttpModule,
    StorageModule,
    MatchingModule,
  ],
  controllers: [ApplicationsController],
  providers: [
    ApplicationsService,
    ApplicationCvParserService,
    ApplicationCvParserProcessor,
  ],
})
export class ApplicationsModule {}
