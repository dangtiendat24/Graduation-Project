import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Processor, WorkerHost } from '@nestjs/bullmq';
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

    const answers = await this.answerRepo.find({ where: { sessionId } });
    if (answers.length === 0) {
      this.logger.warn(
        `Session ${sessionId} không có câu trả lời nào, bỏ qua chấm điểm`,
      );
      return;
    }

    const aiServiceUrl = this.config.get<string>(
      'AI_SERVICE_URL',
      'http://localhost:8000',
    );

    const { data } = await firstValueFrom(
      this.httpService.post<AiScoreAnswersResponse>(
        `${aiServiceUrl}/api/ai/interview/score-answers`,
        {
          session_id: sessionId,
          questions: answers.map((a) => ({
            id: a.questionId,
            question: a.questionText,
            category: a.category,
            difficulty: a.difficulty,
          })),
          answers: answers.map((a) => ({
            question_id: a.questionId,
            answer_text: a.answerText,
          })),
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
      if (!scored) continue;
      answer.subScores = scored.scores;
      answer.totalScore = scored.total;
    }
    await this.answerRepo.save(answers);

    await this.sessionRepo.update(sessionId, {
      overallScore: data.overall_score,
    });
  }
}
