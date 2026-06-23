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
  ],
  controllers: [AppController],
  providers: [AppService, BullMQConfigService],
})
export class AppModule {}
