import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Application } from '../applications/application.entity';
import { MatchingResult } from '../applications/matching-result.entity';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { DashboardCacheService } from './dashboard-cache.service';
import { dashboardRedisProvider } from './dashboard-redis.provider';

@Module({
  imports: [TypeOrmModule.forFeature([Application, MatchingResult])],
  controllers: [DashboardController],
  providers: [DashboardService, DashboardCacheService, dashboardRedisProvider],
  exports: [DashboardCacheService],
})
export class DashboardModule {}
