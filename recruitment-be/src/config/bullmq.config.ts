import { ConfigService } from '@nestjs/config';
import { SharedBullConfigurationFactory } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { BullRootModuleOptions } from '@nestjs/bullmq';

@Injectable()
export class BullMQConfigService implements SharedBullConfigurationFactory {
  constructor(private config: ConfigService) {}

  createSharedConfiguration(): BullRootModuleOptions {
    const redisUrl = this.config.get<string>('REDIS_URL');

    // REDIS_URL (Upstash, production) dùng TLS qua rediss://, ghi đè host/port riêng lẻ (local docker)
    if (redisUrl) {
      const parsed = new URL(redisUrl);
      return {
        connection: {
          host: parsed.hostname,
          port: Number(parsed.port) || 6379,
          username: parsed.username || undefined,
          password: parsed.password || undefined,
          tls: parsed.protocol === 'rediss:' ? {} : undefined,
        },
      };
    }

    return {
      connection: {
        host: this.config.get<string>('REDIS_HOST', 'localhost'),
        port: this.config.get<number>('REDIS_PORT', 6379),
        password: this.config.get<string>('REDIS_PASSWORD'),
      },
    };
  }
}
