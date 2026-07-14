import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Application } from './application.entity';
import type { ApplicationStatus } from './application.entity';
import { User } from '../users/user.entity';

/** Nhật ký chuyển trạng thái của một đơn ứng tuyển, dùng để dựng timeline cho candidate */
@Entity('application_status_history')
export class ApplicationStatusHistory {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'application_id', type: 'uuid' })
  applicationId!: string;

  @ManyToOne(() => Application, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'application_id' })
  application!: Application;

  @Column({ name: 'from_status', type: 'varchar', length: 20, nullable: true })
  fromStatus!: ApplicationStatus | null;

  @Column({ name: 'to_status', type: 'varchar', length: 20 })
  toStatus!: ApplicationStatus;

  @CreateDateColumn({ name: 'changed_at' })
  changedAt!: Date;

  /** Ai/hệ thống nào tạo ra thay đổi này — null nếu do agent tự động thực hiện */
  @Column({ name: 'changed_by', type: 'uuid', nullable: true })
  changedBy!: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'changed_by' })
  changedByUser!: User | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata!: Record<string, unknown> | null;
}
