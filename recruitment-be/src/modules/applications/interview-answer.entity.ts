import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { InterviewSession } from './interview-session.entity';

export type InterviewQuestionCategory =
  | 'technical'
  | 'situational'
  | 'behavioral';
export type InterviewQuestionDifficulty = 'easy' | 'medium' | 'hard';

/** 4 tiêu chí phụ Agent 3 chấm cho mỗi câu trả lời, mỗi tiêu chí thang 0-25 (PRD v3.1 Section 8) */
export interface InterviewAnswerSubScores {
  relevance: number;
  clarity: number;
  depth: number;
  correctness: number;
}

/** Một câu hỏi-trả lời trong buổi phỏng vấn AI (InterviewSession) — điểm được Agent 3 điền sau, không đồng bộ */
@Entity('interview_answers')
// upsert() ở InterviewSessionService.submitAnswer() dựa vào ON CONFLICT (session_id, question_id) —
// khai báo constraint này trong entity metadata để nếu TYPEORM_SYNC=true chạy synchronize(),
// TypeORM giữ/tự tạo lại constraint thay vì xoá nó vì "không khớp entity" (đây là nguyên nhân
// khiến bản fix thêm constraint thủ công qua SQL trước đây bị revert)
@Unique('uq_interview_answers_session_question', ['sessionId', 'questionId'])
export class InterviewAnswer {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'session_id', type: 'uuid' })
  sessionId!: string;

  @ManyToOne(() => InterviewSession, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'session_id' })
  session!: InterviewSession;

  /** id câu hỏi do ai-service sinh ra ở bước /generate-questions */
  @Column({ name: 'question_id', type: 'varchar', length: 100 })
  questionId!: string;

  @Column({ name: 'question_text', type: 'text' })
  questionText!: string;

  @Column({ type: 'varchar', length: 20 })
  category!: InterviewQuestionCategory;

  @Column({ type: 'varchar', length: 10 })
  difficulty!: InterviewQuestionDifficulty;

  @Column({ name: 'answer_text', type: 'text' })
  answerText!: string;

  @Column({ name: 'sub_scores', type: 'jsonb', nullable: true })
  subScores!: InterviewAnswerSubScores | null;

  @Column({
    name: 'total_score',
    type: 'numeric',
    precision: 5,
    scale: 2,
    nullable: true,
  })
  totalScore!: number | null;

  /** Nhận xét ngắn (1-2 câu) do Agent 3 sinh cho riêng câu trả lời này */
  @Column({ type: 'text', nullable: true })
  comment!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
