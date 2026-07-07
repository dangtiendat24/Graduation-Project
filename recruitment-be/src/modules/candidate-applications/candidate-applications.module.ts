import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Application } from '../applications/application.entity';
import { ApplicationStatusHistory } from '../applications/application-status-history.entity';
import { CandidateApplicationsService } from './candidate-applications.service';
import { CandidateApplicationsController } from './candidate-applications.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Application, ApplicationStatusHistory])],
  controllers: [CandidateApplicationsController],
  providers: [CandidateApplicationsService],
})
export class CandidateApplicationsModule {}
