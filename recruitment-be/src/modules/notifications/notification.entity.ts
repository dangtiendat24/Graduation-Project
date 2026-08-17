import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

export type NotificationType =
  | 'new_application'
  | 'matching_complete'
  | 'schedule_proposed'
  | 'schedule_confirmed'
  | 'interview_invite'
  | 'application_rejected'
  | 'application_hired';

/** Thông báo trong-app hiển thị ở chuông thông báo — độc lập với tuỳ chọn nhận email (NotificationPreferences) */
@Entity('notifications')
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @Column({ type: 'varchar', length: 30 })
  type!: NotificationType;

  @Column({ type: 'varchar', length: 200 })
  title!: string;

  @Column({ type: 'text' })
  message!: string;

  /** Route FE để điều hướng khi click vào thông báo */
  @Column({ type: 'varchar', length: 300, nullable: true })
  link!: string | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata!: Record<string, unknown> | null;

  @Column({ name: 'is_read', type: 'boolean', default: false })
  isRead!: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
