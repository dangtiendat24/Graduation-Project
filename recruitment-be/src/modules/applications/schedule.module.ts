import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Application } from './application.entity';
import { ApplicationStatusHistory } from './application-status-history.entity';
import { Schedule } from './schedule.entity';
import { Job } from '../jobs/job.entity';
import { User } from '../users/user.entity';
import { GoogleCalendarModule } from '../google-calendar/google-calendar.module';
import { MailModule } from '../mail/mail.module';
import { DashboardModule } from '../dashboard/dashboard.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { ScheduleService } from './schedule.service';
import { RecruiterScheduleController } from './recruiter-schedule.controller';

/**
 * Module riêng cho luồng đặt lịch phỏng vấn (Agent 4 — SB3-05), tách khỏi ApplicationsModule
 * vì cả RecruiterApplicationsModule (đề xuất khung giờ) lẫn CandidateApplicationsModule
 * (xác nhận khung giờ) đều cần dùng, tránh phụ thuộc vòng giữa 2 module đó.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      Application,
      ApplicationStatusHistory,
      Schedule,
      Job,
      User,
    ]),
    GoogleCalendarModule,
    MailModule,
    DashboardModule,
    NotificationsModule,
  ],
  controllers: [RecruiterScheduleController],
  providers: [ScheduleService],
  exports: [ScheduleService],
})
export class ScheduleModule {}
