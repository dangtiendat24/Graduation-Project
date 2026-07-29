import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { QUEUE_NAMES } from '@smart-recruitment/shared';

export interface InterviewGenerationJobData {
  applicationId: string;
}

@Injectable()
export class InterviewGenerationService {
  constructor(
    @InjectQueue(QUEUE_NAMES.INTERVIEW)
    private readonly queue: Queue<InterviewGenerationJobData>,
  ) {}

  async enqueueGeneration(applicationId: string): Promise<void> {
    await this.queue.add(
      'generate',
      { applicationId },
      {
        jobId: applicationId,
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
      },
    );
  }
}
