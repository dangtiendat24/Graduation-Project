import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { QUEUE_NAMES } from '@smart-recruitment/shared';

export interface ApplicationCvParseJobData {
  applicationId: string;
}

@Injectable()
export class ApplicationCvParserService {
  constructor(
    @InjectQueue(QUEUE_NAMES.APPLICATION_CV_PARSE)
    private readonly queue: Queue<ApplicationCvParseJobData>,
  ) {}

  async enqueueParse(applicationId: string): Promise<void> {
    await this.queue.add(
      'parse',
      { applicationId },
      { attempts: 3, backoff: { type: 'exponential', delay: 2000 } },
    );
  }
}
