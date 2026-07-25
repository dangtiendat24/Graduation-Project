import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { QUEUE_NAMES } from '@smart-recruitment/shared';

export interface InterviewScoringJobData {
  sessionId: string;
}

@Injectable()
export class InterviewScoringService {
  constructor(
    @InjectQueue(QUEUE_NAMES.INTERVIEW_SCORING)
    private readonly queue: Queue<InterviewScoringJobData>,
  ) {}

  async enqueueScoring(sessionId: string): Promise<void> {
    await this.queue.add(
      'score',
      { sessionId },
      { attempts: 3, backoff: { type: 'exponential', delay: 2000 } },
    );
  }
}
