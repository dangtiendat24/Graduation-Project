import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SubmitInterviewAnswerDto {
  @ApiProperty({ description: 'id câu hỏi trong session.questions (vd: "q1")' })
  @IsString()
  @IsNotEmpty()
  questionId!: string;

  @ApiProperty({ description: 'Câu trả lời dạng text của ứng viên' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  answerText!: string;
}
