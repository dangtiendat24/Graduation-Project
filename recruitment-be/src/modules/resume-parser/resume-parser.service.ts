import { Injectable } from '@nestjs/common'
import { InjectQueue } from '@nestjs/bullmq'
import { Queue } from 'bullmq'
import { QUEUE_NAMES } from '@smart-recruitment/shared'

export interface ResumeParseJobData {
  resumeId: string
}

@Injectable()
export class ResumeParserService {
  constructor(
    @InjectQueue(QUEUE_NAMES.RESUME_PARSE)
    private readonly queue: Queue<ResumeParseJobData>,
  ) {}

  async enqueueParse(resumeId: string): Promise<void> {
    await this.queue.add(
      'parse',
      { resumeId },
      { attempts: 3, backoff: { type: 'exponential', delay: 2000 } },
    )
  }
}
