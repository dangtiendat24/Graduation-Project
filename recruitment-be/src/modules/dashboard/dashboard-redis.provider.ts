import { Logger, Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { getRedisConnectionOptions } from '../../config/redis-connection.util';

export const DASHBOARD_REDIS_CLIENT = 'DASHBOARD_REDIS_CLIENT';

const logger = new Logger('DashboardRedis');

export const dashboardRedisProvider: Provider = {
  provide: DASHBOARD_REDIS_CLIENT,
  inject: [ConfigService],
  useFactory: (config: ConfigService) => {
    // Cache là tối ưu hiệu năng, không phải nguồn dữ liệu — nếu Redis down thì lệnh phải
    // fail nhanh (không queue/retry 20 lần ~ chục giây) để dashboard.service có thể fallback
    // sang tính trực tiếp từ Postgres thay vì làm treo request.
    const client = new Redis({
      ...getRedisConnectionOptions(config),
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
    });
    client.on('error', (err) =>
      logger.warn(`Redis connection error: ${err.message}`),
    );
    return client;
  },
};
