import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InterviewSession } from './interview-session.entity';
import { InterviewAnswer } from './interview-answer.entity';
import { SubmitInterviewAnswerDto } from './dto/submit-interview-answer.dto';
import { InterviewScoringService } from './interview-scoring.service';

@Injectable()
export class InterviewSessionService {
  constructor(
    @InjectRepository(InterviewSession)
    private readonly sessionRepo: Repository<InterviewSession>,
    @InjectRepository(InterviewAnswer)
    private readonly answerRepo: Repository<InterviewAnswer>,
    private readonly scoringQueue: InterviewScoringService,
  ) {}

  async submitAnswer(
    candidateId: string,
    sessionId: string,
    dto: SubmitInterviewAnswerDto,
  ): Promise<InterviewAnswer> {
    const session = await this.findOwnedSession(candidateId, sessionId);

    if (session.status === 'completed' || session.status === 'timeout') {
      throw new BadRequestException(
        `Buổi phỏng vấn đã ở trạng thái "${session.status}", không thể nộp thêm câu trả lời`,
      );
    }

    if (session.status === 'pending') {
      session.status = 'in_progress';
      session.startedAt = new Date();
      await this.sessionRepo.save(session);
    }

    let answer = await this.answerRepo.findOne({
      where: { sessionId, questionId: dto.questionId },
    });
    if (!answer) {
      answer = this.answerRepo.create({ sessionId });
    }
    answer.questionId = dto.questionId;
    answer.questionText = dto.questionText;
    answer.category = dto.category;
    answer.difficulty = dto.difficulty;
    answer.answerText = dto.answerText;

    return this.answerRepo.save(answer);
  }

  async completeSession(
    candidateId: string,
    sessionId: string,
  ): Promise<InterviewSession> {
    const session = await this.findOwnedSession(candidateId, sessionId);

    if (session.status === 'completed' || session.status === 'timeout') {
      throw new BadRequestException(
        `Buổi phỏng vấn đã ở trạng thái "${session.status}"`,
      );
    }

    const answerCount = await this.answerRepo.count({ where: { sessionId } });
    if (answerCount === 0) {
      throw new BadRequestException(
        'Chưa có câu trả lời nào được nộp cho buổi phỏng vấn này',
      );
    }

    session.status = 'completed';
    session.completedAt = new Date();
    await this.sessionRepo.save(session);

    await this.scoringQueue.enqueueScoring(session.id);

    return session;
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
