import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SubmitVoiceAnswerDto {
  @ApiProperty({
    description:
      'id câu hỏi đang được trả lời — PHẢI khớp interview_sessions.current_question.id, dùng để phát hiện submit lặp/không khớp',
  })
  @IsString()
  @IsNotEmpty()
  questionId!: string;

  @ApiPropertyOptional({
    description:
      'Độ trễ (ms) từ lúc audio câu hỏi phát xong đến lúc ứng viên bắt đầu ghi âm trả lời',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  responseLatencyMs?: number;

  @ApiPropertyOptional({
    description: 'Số lần ứng viên rời tab/cửa sổ trong lúc trả lời',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  tabBlurCount?: number;

  @ApiPropertyOptional({
    description: 'Tổng thời gian rời tab (ms) trong lúc trả lời',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  tabBlurTotalMs?: number;
}
