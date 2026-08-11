import { Inject, Injectable, Logger } from '@nestjs/common';
import type { Redis } from 'ioredis';
import { DASHBOARD_REDIS_CLIENT } from './dashboard-redis.provider';

export function dashboardStatsCacheKey(recruiterId: string): string {
  return `dashboard:stats:${recruiterId}`;
}

/**
 * Invalidation cho cache /dashboard/stats — tách riêng khỏi DashboardService để các module khác
 * (applications, recruiter-applications, schedule, matching) chỉ cần import DashboardModule và
 * gọi invalidate() khi có application mới / đổi status, không phải phụ thuộc vào toàn bộ
 * DashboardService (vốn cần Application + MatchingResult repo không liên quan tới các module đó).
 */
@Injectable()
export class DashboardCacheService {
  private readonly logger = new Logger(DashboardCacheService.name);

  constructor(
    @Inject(DASHBOARD_REDIS_CLIENT)
    private readonly redis: Redis,
  ) {}

  async invalidate(recruiterId: string): Promise<void> {
    try {
      await this.redis.del(dashboardStatsCacheKey(recruiterId));
    } catch (err) {
      this.logger.warn(
        `Bỏ qua invalidate cache (Redis lỗi): ${(err as Error).message}`,
      );
    }
  }
}
