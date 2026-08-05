import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Application } from '../applications/application.entity';
import { ApplicationStatusHistory } from '../applications/application-status-history.entity';
import { ScheduleModule } from '../applications/schedule.module';
import { CandidateApplicationsService } from './candidate-applications.service';
import { CandidateApplicationsController } from './candidate-applications.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Application, ApplicationStatusHistory]),
    ScheduleModule,
  ],
  controllers: [CandidateApplicationsController],
  providers: [CandidateApplicationsService],
})
export class CandidateApplicationsModule {}
