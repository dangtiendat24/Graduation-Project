import 'multer';
import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Post,
  Request,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { VoiceInterviewService } from './voice-interview.service';
import { SubmitVoiceAnswerDto } from './dto/submit-voice-answer.dto';

interface JwtUser {
  id: string;
  email: string;
  role: string;
}

const MAX_AUDIO_SIZE = 20 * 1024 * 1024;

/**
 * Điều phối voice interview (adaptive) — controller RIÊNG, song song với InterviewSessionController
 * (text). Cùng route prefix "interviews/:sessionId" nhưng sub-path "/voice/*" tách biệt hoàn toàn.
 */
@ApiTags('interviews-voice')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('interviews')
export class VoiceInterviewController {
  constructor(private readonly voiceInterviewService: VoiceInterviewService) {}

  @ApiOperation({
    summary:
      'Bắt đầu voice interview — khóa mode="voice" cho session (chỉ khi đang "pending"), sinh câu hỏi mở đầu kèm audio TTS',
  })
  @Post(':sessionId/voice/start')
  startVoice(
    @Request() req: { user: JwtUser },
    @Param('sessionId') sessionId: string,
  ) {
    this.assertCandidate(req.user);
    return this.voiceInterviewService.startSession(req.user.id, sessionId);
  }

  @ApiOperation({
    summary:
      'Lấy trạng thái hiện tại của voice interview (câu hỏi đang chờ trả lời kèm audio) — dùng để resume khi ứng viên tải lại trang',
  })
  @Get(':sessionId/voice')
  getVoiceState(
    @Request() req: { user: JwtUser },
    @Param('sessionId') sessionId: string,
  ) {
    this.assertCandidate(req.user);
    return this.voiceInterviewService.getSessionState(req.user.id, sessionId);
  }

  @ApiOperation({
    summary:
      'Nộp audio trả lời cho câu hỏi hiện tại — chấm điểm + đọc feedback + sinh câu hỏi kế tiếp (hoặc hoàn tất nếu là câu cuối). Không gửi field "audio" nếu ứng viên hết giờ mà không trả lời.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        questionId: { type: 'string' },
        responseLatencyMs: { type: 'number' },
        tabBlurCount: { type: 'number' },
        tabBlurTotalMs: { type: 'number' },
        audio: { type: 'string', format: 'binary' },
      },
    },
  })
  @Post(':sessionId/voice/answer')
  @UseInterceptors(
    FileInterceptor('audio', { limits: { fileSize: MAX_AUDIO_SIZE } }),
  )
  submitVoiceAnswer(
    @Request() req: { user: JwtUser },
    @Param('sessionId') sessionId: string,
    @Body() dto: SubmitVoiceAnswerDto,
    @UploadedFile() audio?: Express.Multer.File,
  ) {
    this.assertCandidate(req.user);
    if (audio && !audio.mimetype.startsWith('audio/')) {
      throw new BadRequestException('File audio không hợp lệ');
    }
    return this.voiceInterviewService.submitAnswer(
      req.user.id,
      sessionId,
      dto,
      audio,
    );
  }

  @ApiOperation({
    summary:
      'Kết thúc sớm voice interview — các câu chưa trả lời tính như 0 điểm (chia đều cho tổng 7 câu)',
  })
  @Post(':sessionId/voice/end')
  endVoiceInterview(
    @Request() req: { user: JwtUser },
    @Param('sessionId') sessionId: string,
  ) {
    this.assertCandidate(req.user);
    return this.voiceInterviewService.endInterview(req.user.id, sessionId);
  }

  private assertCandidate(user: JwtUser): void {
    if (user.role !== 'candidate') {
      throw new ForbiddenException(
        'Chỉ Candidate mới có thể thao tác trên buổi phỏng vấn',
      );
    }
  }
}
