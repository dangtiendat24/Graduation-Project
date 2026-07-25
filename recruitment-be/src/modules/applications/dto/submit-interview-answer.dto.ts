import { IsIn, IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import type {
  InterviewQuestionCategory,
  InterviewQuestionDifficulty,
} from '../interview-answer.entity';

const CATEGORIES: InterviewQuestionCategory[] = [
  'technical',
  'situational',
  'behavioral',
];
const DIFFICULTIES: InterviewQuestionDifficulty[] = ['easy', 'medium', 'hard'];

export class SubmitInterviewAnswerDto {
  @ApiProperty({ description: 'id câu hỏi do ai-service sinh (vd: "q1")' })
  @IsString()
  @IsNotEmpty()
  questionId!: string;

  @ApiProperty({ description: 'Nội dung câu hỏi đã hiển thị cho ứng viên' })
  @IsString()
  @IsNotEmpty()
  questionText!: string;

  @ApiProperty({ enum: CATEGORIES })
  @IsIn(CATEGORIES)
  category!: InterviewQuestionCategory;

  @ApiProperty({ enum: DIFFICULTIES })
  @IsIn(DIFFICULTIES)
  difficulty!: InterviewQuestionDifficulty;

  @ApiProperty({ description: 'Câu trả lời dạng text của ứng viên' })
  @IsString()
  @IsNotEmpty()
  answerText!: string;
}
