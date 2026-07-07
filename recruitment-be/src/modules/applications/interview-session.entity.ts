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

export type InterviewSessionStatus =
  | 'pending'
  | 'in_progress'
  | 'completed'
  | 'timeout';

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

  @Column({
    name: 'overall_score',
    type: 'numeric',
    precision: 5,
    scale: 2,
    nullable: true,
  })
  overallScore!: number | null;

  @Column({ name: 'started_at', type: 'timestamptz', nullable: true })
  startedAt!: Date | null;

  @Column({ name: 'completed_at', type: 'timestamptz', nullable: true })
  completedAt!: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
