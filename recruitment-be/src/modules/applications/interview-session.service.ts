import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InterviewSession } from './interview-session.entity';
import {
  InterviewAnswer,
  InterviewAnswerSubScores,
} from './interview-answer.entity';
import { SubmitInterviewAnswerDto } from './dto/submit-interview-answer.dto';
import { InterviewScoringService } from './interview-scoring.service';

const CLOSED_STATUSES = ['completed', 'timeout', 'cancelled'];
/** Số câu tối thiểu phải trả lời mới được nộp bài — câu còn lại tính 0 điểm */
const MIN_ANSWERS_TO_COMPLETE = 1;
const ZERO_SUB_SCORES: InterviewAnswerSubScores = {
  relevance: 0,
  clarity: 0,
  depth: 0,
  correctness: 0,
};

@Injectable()
export class InterviewSessionService {
  constructor(
    @InjectRepository(InterviewSession)
    private readonly sessionRepo: Repository<InterviewSession>,
    @InjectRepository(InterviewAnswer)
    private readonly answerRepo: Repository<InterviewAnswer>,
    private readonly scoringQueue: InterviewScoringService,
  ) {}

  /** Dùng bởi InterviewGenerationProcessor — tạo session nếu chưa có, idempotent nếu gọi lại. */
  async getOrCreateForApplication(
    applicationId: string,
  ): Promise<InterviewSession> {
    const existing = await this.sessionRepo.findOne({
      where: { applicationId },
    });
    if (existing) return existing;

    const created = this.sessionRepo.create({
      applicationId,
      status: 'pending',
    });
    return this.sessionRepo.save(created);
  }

  async getSessionDetail(
    candidateId: string,
    sessionId: string,
  ): Promise<{ session: InterviewSession; answers: InterviewAnswer[] }> {
    const session = await this.findOwnedSession(candidateId, sessionId);
    const answers = await this.answerRepo.find({ where: { sessionId } });
    return { session, answers };
  }

  async submitAnswer(
    candidateId: string,
    sessionId: string,
    dto: SubmitInterviewAnswerDto,
  ): Promise<InterviewAnswer> {
    const session = await this.findOwnedSession(candidateId, sessionId);

    if (CLOSED_STATUSES.includes(session.status)) {
      throw new BadRequestException(
        `Buổi phỏng vấn đã ở trạng thái "${session.status}", không thể nộp thêm câu trả lời`,
      );
    }

    if (session.questionsStatus !== 'done' || !session.questions) {
      throw new BadRequestException(
        'Câu hỏi phỏng vấn chưa sẵn sàng, vui lòng thử lại sau',
      );
    }

    const question = session.questions.find((q) => q.id === dto.questionId);
    if (!question) {
      throw new BadRequestException(
        `questionId "${dto.questionId}" không khớp bộ câu hỏi của buổi phỏng vấn này`,
      );
    }

    if (session.status === 'pending') {
      session.status = 'in_progress';
      session.startedAt = new Date();
      await this.sessionRepo.save(session);
    }

    // Nội dung câu hỏi luôn lấy từ session.questions (nguồn chân lý) — không tin questionText/category/difficulty từ client
    await this.answerRepo.upsert(
      {
        sessionId,
        questionId: question.id,
        questionText: question.question,
        category: question.category,
        difficulty: question.difficulty,
        answerText: dto.answerText,
      },
      ['sessionId', 'questionId'],
    );

    return this.answerRepo.findOneByOrFail({
      sessionId,
      questionId: question.id,
    });
  }

  async completeSession(
    candidateId: string,
    sessionId: string,
  ): Promise<InterviewSession> {
    const session = await this.findOwnedSession(candidateId, sessionId);

    if (CLOSED_STATUSES.includes(session.status)) {
      throw new BadRequestException(
        `Buổi phỏng vấn đã ở trạng thái "${session.status}"`,
      );
    }

    const answerCount = await this.answerRepo.count({ where: { sessionId } });
    if (answerCount < MIN_ANSWERS_TO_COMPLETE) {
      throw new BadRequestException(
        `Cần trả lời ít nhất ${MIN_ANSWERS_TO_COMPLETE} câu hỏi trước khi nộp bài (hiện đã trả lời ${answerCount})`,
      );
    }

    await this.fillSkippedQuestionsWithZeroScore(session);

    // Enqueue trước khi lưu status=completed: nếu enqueue lỗi (vd Redis down), session vẫn
    // ở trạng thái cũ nên candidate có thể gọi lại complete thay vì bị kẹt vĩnh viễn.
    await this.scoringQueue.enqueueScoring(session.id);

    // Dùng update() có chủ đích (chỉ ghi 2 cột này) thay vì save() cả entity — BullMQ worker
    // có thể đã bắt đầu xử lý job chấm điểm song song và ghi scoringStatus/overallScore lên
    // cùng dòng này; save() cả entity ở đây sẽ đè mất field đó bằng bản snapshot cũ trong tay,
    // và ngược lại save() cả entity ở processor cũng sẽ đè mất status='completed' vừa ghi.
    const completedAt = new Date();
    await this.sessionRepo.update(session.id, {
      status: 'completed',
      completedAt,
    });
    session.status = 'completed';
    session.completedAt = completedAt;
    return session;
  }

  /**
   * Câu hỏi trong session.questions mà ứng viên bỏ qua (không nộp) được ghi nhận ngay với
   * điểm 0 — không chờ Agent 3 chấm vì AI service từ chối answer_text rỗng.
   */
  private async fillSkippedQuestionsWithZeroScore(
    session: InterviewSession,
  ): Promise<void> {
    const questions = session.questions ?? [];
    if (questions.length === 0) return;

    const existing = await this.answerRepo.find({
      where: { sessionId: session.id },
    });
    const answeredIds = new Set(existing.map((a) => a.questionId));
    const skipped = questions.filter((q) => !answeredIds.has(q.id));
    if (skipped.length === 0) return;

    const rows = skipped.map((q) =>
      this.answerRepo.create({
        sessionId: session.id,
        questionId: q.id,
        questionText: q.question,
        category: q.category,
        difficulty: q.difficulty,
        answerText: '',
        subScores: ZERO_SUB_SCORES,
        totalScore: 0,
        comment: 'Ứng viên không trả lời câu hỏi này',
      }),
    );
    await this.answerRepo.save(rows);
  }

  private async findOwnedSession(
    candidateId: string,
    sessionId: string,
  ): Promise<InterviewSession> {
    const session = await this.sessionRepo.findOne({
      where: { id: sessionId },
      relations: ['application'],
    });
    if (!session) {
      throw new NotFoundException('Không tìm thấy buổi phỏng vấn');
    }
    if (session.application.candidateId !== candidateId) {
      throw new ForbiddenException(
        'Bạn không có quyền truy cập buổi phỏng vấn này',
      );
    }
    return session;
  }
}
