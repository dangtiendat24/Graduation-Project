import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { QUEUE_NAMES } from '@smart-recruitment/shared';

export interface CvMatchJobData {
  applicationId: string;
}

@Injectable()
export class MatchingService {
  constructor(
    @InjectQueue(QUEUE_NAMES.CV_MATCHING)
    private readonly queue: Queue<CvMatchJobData>,
  ) {}

  async enqueueMatch(applicationId: string): Promise<void> {
    await this.queue.add(
      'match',
      { applicationId },
      { attempts: 3, backoff: { type: 'exponential', delay: 2000 } },
    );
  }
}
