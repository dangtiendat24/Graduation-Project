import { ConfigService } from '@nestjs/config';
import type { RedisOptions } from 'ioredis';

/** Đọc REDIS_URL (Upstash/TLS, production) hoặc REDIS_HOST/PORT/PASSWORD rời (local docker) */
export function getRedisConnectionOptions(config: ConfigService): RedisOptions {
  const redisUrl = config.get<string>('REDIS_URL');

  if (redisUrl) {
    const parsed = new URL(redisUrl);
    return {
      host: parsed.hostname,
      port: Number(parsed.port) || 6379,
      username: parsed.username || undefined,
      password: parsed.password || undefined,
      tls: parsed.protocol === 'rediss:' ? {} : undefined,
    };
  }

  return {
    host: config.get<string>('REDIS_HOST', 'localhost'),
    port: config.get<number>('REDIS_PORT', 6379),
    password: config.get<string>('REDIS_PASSWORD'),
  };
}
