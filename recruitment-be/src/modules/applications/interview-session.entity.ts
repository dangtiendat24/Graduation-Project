import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { Application } from './application.entity';
import type {
  InterviewQuestionCategory,
  InterviewQuestionDifficulty,
} from './interview-answer.entity';

export type InterviewSessionStatus =
  | 'pending'
  | 'in_progress'
  | 'completed'
  | 'timeout'
  | 'cancelled';

/**
 * Kênh giao tiếp của buổi phỏng vấn — chọn 1 lần khi bắt đầu và khóa cứng cho cả session,
 * không cho đổi giữa chừng (tránh việc câu trả lời của cùng 1 bài phỏng vấn bị chia làm 2 kênh).
 * 'voice' là mặc định/ưu tiên trên giao diện; 'text' chỉ là lựa chọn thay thế khi ứng viên
 * không dùng được mic.
 */
export type InterviewSessionMode = 'text' | 'voice';

/** Trạng thái pipeline sinh câu hỏi / chấm điểm — cùng vocabulary với ParseStatus (Application) */
export type InterviewPipelineStatus =
  | 'pending'
  | 'processing'
  | 'done'
  | 'error';

/** 1 câu hỏi trong danh sách câu hỏi chuẩn do ai-service sinh ở /generate-questions */
export interface GeneratedQuestionItem {
  id: string;
  question: string;
  category: InterviewQuestionCategory;
  difficulty: InterviewQuestionDifficulty;
}

/** Ghi lại bởi Agent 3 (AI Interview) — kết quả buổi phỏng vấn AI của một đơn ứng tuyển */
@Entity('interview_sessions')
export class InterviewSession {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'application_id', type: 'uuid' })
  applicationId!: string;

  @OneToOne(() => Application, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'application_id' })
  application!: Application;

  @Column({ type: 'varchar', length: 20, default: 'pending' })
  status!: InterviewSessionStatus;

  @Column({ type: 'varchar', length: 10, default: 'text' })
  mode!: InterviewSessionMode;

  /** Danh sách câu hỏi chuẩn do ai-service sinh — nguồn chân lý duy nhất cho submitAnswer/chấm điểm */
  @Column({ type: 'jsonb', nullable: true })
  questions!: GeneratedQuestionItem[] | null;

  @Column({
    name: 'questions_status',
    type: 'varchar',
    length: 20,
    default: 'pending',
  })
  questionsStatus!: InterviewPipelineStatus;

  @Column({ name: 'questions_error', type: 'text', nullable: true })
  questionsError!: string | null;

  @Column({
    name: 'scoring_status',
    type: 'varchar',
    length: 20,
    default: 'pending',
  })
  scoringStatus!: InterviewPipelineStatus;

  @Column({ name: 'scoring_error', type: 'text', nullable: true })
  scoringError!: string | null;

  @Column({ type: 'text', nullable: true })
  transcript!: string | null;

  @Column({
    name: 'overall_score',
    type: 'numeric',
    precision: 5,
    scale: 2,
    nullable: true,
  })
  overallScore!: number | null;

  /** Câu hỏi đang chờ trả lời trong voice interview (adaptive) — null khi mode='text' hoặc đã hoàn tất */
  @Column({ name: 'current_question', type: 'jsonb', nullable: true })
  currentQuestion!: GeneratedQuestionItem | null;

  @Column({ name: 'started_at', type: 'timestamptz', nullable: true })
  startedAt!: Date | null;

  @Column({ name: 'completed_at', type: 'timestamptz', nullable: true })
  completedAt!: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
