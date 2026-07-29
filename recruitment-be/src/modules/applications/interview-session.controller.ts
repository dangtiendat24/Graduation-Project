import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { InterviewSessionService } from './interview-session.service';
import { SubmitInterviewAnswerDto } from './dto/submit-interview-answer.dto';

interface JwtUser {
  id: string;
  email: string;
  role: string;
}

@ApiTags('interviews')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('interviews')
export class InterviewSessionController {
  constructor(
    private readonly interviewSessionService: InterviewSessionService,
  ) {}

  @ApiOperation({
    summary:
      'Lấy chi tiết buổi phỏng vấn (câu hỏi + câu trả lời đã nộp) cho ứng viên — không lộ điểm/nhận xét/transcript',
  })
  @Get(':sessionId')
  async getSession(
    @Request() req: { user: JwtUser },
    @Param('sessionId') sessionId: string,
  ) {
    this.assertCandidate(req.user);
    const { session, answers } =
      await this.interviewSessionService.getSessionDetail(
        req.user.id,
        sessionId,
      );

    return {
      id: session.id,
      applicationId: session.applicationId,
      status: session.status,
      questionsStatus: session.questionsStatus,
      questionsError: session.questionsError,
      questions: session.questions,
      scoringStatus: session.scoringStatus,
      overallScore: session.overallScore,
      answers: answers.map((a) => ({
        questionId: a.questionId,
        answerText: a.answerText,
      })),
    };
  }

  @ApiOperation({
    summary:
      'Lưu 1 câu trả lời text cho buổi phỏng vấn AI (chưa chấm điểm ngay)',
  })
  @Post(':sessionId/answer')
  submitAnswer(
    @Request() req: { user: JwtUser },
    @Param('sessionId') sessionId: string,
    @Body() dto: SubmitInterviewAnswerDto,
  ) {
    this.assertCandidate(req.user);
    return this.interviewSessionService.submitAnswer(
      req.user.id,
      sessionId,
      dto,
    );
  }

  @ApiOperation({
    summary:
      'Đánh dấu ứng viên đã nộp xong toàn bộ câu trả lời — chuyển session sang "completed" và enqueue job chấm điểm (Agent 3, BullMQ)',
  })
  @Post(':sessionId/complete')
  completeSession(
    @Request() req: { user: JwtUser },
    @Param('sessionId') sessionId: string,
  ) {
    this.assertCandidate(req.user);
    return this.interviewSessionService.completeSession(req.user.id, sessionId);
  }

  private assertCandidate(user: JwtUser): void {
    if (user.role !== 'candidate') {
      throw new ForbiddenException(
        'Chỉ Candidate mới có thể thao tác trên buổi phỏng vấn',
      );
    }
  }
}
