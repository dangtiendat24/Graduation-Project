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

export type ScheduleStatus = 'pending' | 'confirmed' | 'cancelled';

export interface ProposedSlot {
  start: string;
  end: string;
}

/** Ghi lại bởi Agent 4 (Scheduling) — lịch phỏng vấn được đề xuất/xác nhận cho một đơn ứng tuyển */
@Entity('schedules')
export class Schedule {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'application_id', type: 'uuid' })
  applicationId!: string;

  @OneToOne(() => Application, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'application_id' })
  application!: Application;

  @Column({ type: 'varchar', length: 20, default: 'pending' })
  status!: ScheduleStatus;

  /** Các khung giờ recruiter đề xuất (từ agent4 suggest-slots) — ứng viên chọn 1 để xác nhận */
  @Column({ name: 'proposed_slots', type: 'jsonb', nullable: true })
  proposedSlots!: ProposedSlot[] | null;

  @Column({ name: 'confirmed_start_time', type: 'timestamptz', nullable: true })
  confirmedStartTime!: Date | null;

  @Column({ name: 'confirmed_end_time', type: 'timestamptz', nullable: true })
  confirmedEndTime!: Date | null;

  @Column({ name: 'meet_link', type: 'varchar', length: 500, nullable: true })
  meetLink!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
