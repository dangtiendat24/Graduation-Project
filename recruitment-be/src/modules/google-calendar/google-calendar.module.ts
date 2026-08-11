import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { GoogleCalendarCredential } from './google-calendar-credential.entity';
import { GoogleCalendarService } from './google-calendar.service';
import { GoogleCalendarController } from './google-calendar.controller';
import { AdminModule } from '../admin/admin.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([GoogleCalendarCredential]),
    ConfigModule,
    HttpModule.register({ timeout: 20000, maxRedirects: 3 }),
    AdminModule,
    // Đăng ký JwtModule riêng (cùng JWT_SECRET) để ký/verify state token của OAuth flow,
    // độc lập với AuthModule — tránh phụ thuộc vòng giữa 2 module.
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET', 'changeme_secret'),
      }),
    }),
  ],
  controllers: [GoogleCalendarController],
  providers: [GoogleCalendarService],
  exports: [GoogleCalendarService],
})
export class GoogleCalendarModule {}
