import { ConfigService } from '@nestjs/config';
import { SharedBullConfigurationFactory } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { BullModuleOptions } from '@nestjs/bullmq';

@Injectable()
export class BullMQConfigService implements SharedBullConfigurationFactory {
  constructor(private config: ConfigService) {}

  createSharedConfiguration(): BullModuleOptions {
    return {
      connection: {
        host: this.config.get<string>('REDIS_HOST', 'localhost'),
        port: this.config.get<number>('REDIS_PORT', 6379),
        password: this.config.get<string>('REDIS_PASSWORD'),
      },
    };
  }
}
