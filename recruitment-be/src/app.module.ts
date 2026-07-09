import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { MailModule } from './modules/mail/mail.module';
import { CompaniesModule } from './modules/companies/companies.module';
import { ProfileModule } from './modules/profile/profile.module';
import { JobsModule } from './modules/jobs/jobs.module';
import { ApplicationsModule } from './modules/applications/applications.module';
import { ResumeParserModule } from './modules/resume-parser/resume-parser.module';
import { MatchingModule } from './modules/matching/matching.module';
import { CandidatesModule } from './modules/candidates/candidates.module';
import { CandidateApplicationsModule } from './modules/candidate-applications/candidate-applications.module';
import { RecruiterApplicationsModule } from './modules/recruiter-applications/recruiter-applications.module';
import { getTypeOrmConfig } from './config/typeorm.config';
import { BullMQConfigService } from './config/bullmq.config';

@Module({
  imports: [
    // Config toàn cục — đọc từ .env, validate khi khởi động
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    // Database — TypeORM + PostgreSQL
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: getTypeOrmConfig,
    }),

    // Queue — BullMQ + Redis
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useClass: BullMQConfigService,
    }),

    // Domain modules
    AuthModule,
    UsersModule,
    MailModule,
    CompaniesModule,
    ProfileModule,
    JobsModule,
    ApplicationsModule,
    ResumeParserModule,
    MatchingModule,
    CandidatesModule,
    CandidateApplicationsModule,
    RecruiterApplicationsModule,
  ],
  controllers: [AppController],
  providers: [AppService, BullMQConfigService],
})
export class AppModule {}
