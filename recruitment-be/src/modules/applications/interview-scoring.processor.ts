import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { HttpService } from '@nestjs/axios';
import { Repository } from 'typeorm';
import { Job as BullJob } from 'bullmq';
import { firstValueFrom } from 'rxjs';
import { QUEUE_NAMES } from '@smart-recruitment/shared';
import { InterviewSession } from './interview-session.entity';
import { InterviewAnswer } from './interview-answer.entity';
import { InterviewScoringJobData } from './interview-scoring.service';

interface AiScoredAnswer {
  question_id: string;
  scores: {
    relevance: number;
    clarity: number;
    depth: number;
    correctness: number;
  };
  total: number;
}

interface AiScoreAnswersResponse {
  session_id: string;
  scored_answers: AiScoredAnswer[];
  overall_score: number;
  transcript: string;
  success: boolean;
  error: string | null;
}

@Processor(QUEUE_NAMES.INTERVIEW_SCORING)
export class InterviewScoringProcessor extends WorkerHost {
  private readonly logger = new Logger(InterviewScoringProcessor.name);

  constructor(
    @InjectRepository(InterviewSession)
    private readonly sessionRepo: Repository<InterviewSession>,
    @InjectRepository(InterviewAnswer)
    private readonly answerRepo: Repository<InterviewAnswer>,
    private readonly httpService: HttpService,
    private readonly config: ConfigService,
  ) {
    super();
  }

  async process(job: BullJob<InterviewScoringJobData>): Promise<void> {
    const { sessionId } = job.data;

    const session = await this.sessionRepo.findOne({
      where: { id: sessionId },
    });
    if (!session) return;

    const answers = await this.answerRepo.find({ where: { sessionId } });
    if (answers.length === 0) {
      this.logger.warn(
        `Session ${sessionId} không có câu trả lời nào, bỏ qua chấm điểm`,
      );
      return;
    }

    session.scoringStatus = 'processing';
    await this.sessionRepo.save(session);

    const aiServiceUrl = this.config.get<string>(
      'AI_SERVICE_URL',
      'http://localhost:8000',
    );

    try {
      // questions luôn lấy từ session.questions (nguồn chân lý do /generate-questions sinh ra) —
      // không dựng lại từ answers, vì answers.questionText có thể bị client cũ gửi lên tuỳ ý
      const { data } = await firstValueFrom(
        this.httpService.post<AiScoreAnswersResponse>(
          `${aiServiceUrl}/api/ai/interview/score-answers`,
          {
            session_id: sessionId,
            questions: session.questions ?? [],
            answers: answers.map((a) => ({
              question_id: a.questionId,
              answer_text: a.answerText,
            })),
          },
          {
            headers: {
              'x-internal-secret': this.config.get<string>(
                'AI_SERVICE_INTERNAL_SECRET',
                '',
              ),
            },
          },
        ),
      );

      if (!data.success) {
        throw new Error(data.error ?? 'AI service trả về lỗi không xác định');
      }

      const scoresByQuestionId = new Map(
        data.scored_answers.map((s) => [s.question_id, s]),
      );

      for (const answer of answers) {
        const scored = scoresByQuestionId.get(answer.questionId);
        if (!scored) {
          this.logger.warn(
            `Session ${sessionId}: AI service không trả điểm cho question_id=${answer.questionId}`,
          );
          continue;
        }
        answer.subScores = scored.scores;
        answer.totalScore = scored.total;
      }
      await this.answerRepo.save(answers);

      session.overallScore = data.overall_score;
      session.transcript = data.transcript;
      session.scoringStatus = 'done';
      session.scoringError = null;
      await this.sessionRepo.save(session);
    } catch (err) {
      session.scoringStatus = 'error';
      session.scoringError = (err as Error).message;
      await this.sessionRepo.save(session);
      this.logger.error(
        `Chấm điểm phỏng vấn thất bại cho session ${sessionId}: ${(err as Error).message}`,
      );
      throw err;
    }
  }

  @OnWorkerEvent('failed')
  async onFailed(job: BullJob<InterviewScoringJobData>): Promise<void> {
    const attemptsMade = job.attemptsMade;
    const maxAttempts =
      typeof job.opts.attempts === 'number' ? job.opts.attempts : 1;
    if (attemptsMade < maxAttempts) return;

    const { sessionId } = job.data;
    this.logger.error(
      `Session ${sessionId}: chấm điểm thất bại vĩnh viễn sau ${attemptsMade} lần thử`,
    );
    await this.sessionRepo.update(
      { id: sessionId, scoringStatus: 'processing' },
      { scoringStatus: 'error', scoringError: 'Hết số lần retry chấm điểm' },
    );
  }
}
