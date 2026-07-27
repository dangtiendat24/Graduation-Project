import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Application } from '../applications/application.entity';
import { ApplicationStatusHistory } from '../applications/application-status-history.entity';
import { InterviewSession } from '../applications/interview-session.entity';
import { InterviewAnswer } from '../applications/interview-answer.entity';
import { Job } from '../jobs/job.entity';
import { MailModule } from '../mail/mail.module';
import { ApplicationsModule } from '../applications/applications.module';
import { RecruiterApplicationsService } from './recruiter-applications.service';
import { RecruiterApplicationsController } from './recruiter-applications.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Application,
      ApplicationStatusHistory,
      InterviewSession,
      InterviewAnswer,
      Job,
    ]),
    MailModule,
    ApplicationsModule,
  ],
  controllers: [RecruiterApplicationsController],
  providers: [RecruiterApplicationsService],
})
export class RecruiterApplicationsModule {}
