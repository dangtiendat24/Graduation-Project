import { ConfigService } from '@nestjs/config';
import { SharedBullConfigurationFactory } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { BullRootModuleOptions } from '@nestjs/bullmq';
import { getRedisConnectionOptions } from './redis-connection.util';

@Injectable()
export class BullMQConfigService implements SharedBullConfigurationFactory {
  constructor(private config: ConfigService) {}

  createSharedConfiguration(): BullRootModuleOptions {
    return {
      connection: getRedisConnectionOptions(this.config),
    };
  }
}
