import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import type { MatchingWeights } from '@smart-recruitment/shared';
import type { NotificationPreferences } from '../settings/notification-preferences';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', unique: true, length: 255 })
  email: string;

  @Column({
    type: 'varchar',
    name: 'password_hash',
    length: 60,
    nullable: true,
  })
  passwordHash: string | null;

  @Column({ type: 'varchar', length: 20 })
  role: 'recruiter' | 'candidate';

  @Column({ type: 'varchar', name: 'full_name', length: 100 })
  fullName: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  phone: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  city: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  linkedin: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  github: string | null;

  @Column({ type: 'varchar', name: 'avatar_url', nullable: true })
  avatarUrl: string | null;

  /** Storage key nội bộ khi avatar do user tự upload (khác avatar Google) — dùng để xoá file cũ khi thay/xoá avatar */
  @Column({
    type: 'varchar',
    name: 'avatar_storage_key',
    length: 500,
    nullable: true,
  })
  avatarStorageKey: string | null;

  @Column({ type: 'varchar', name: 'google_id', nullable: true, unique: true })
  googleId: string | null;

  @Column({ type: 'boolean', name: 'is_active', default: false })
  isActive: boolean;

  @Column({
    type: 'varchar',
    name: 'email_verify_token',
    nullable: true,
    unique: true,
  })
  emailVerifyToken: string | null;

  @Column({ type: 'timestamptz', name: 'email_verify_expires', nullable: true })
  emailVerifyExpires: Date | null;

  /** null = chưa cấu hình, coi như bật hết (xem DEFAULT_NOTIFICATION_PREFERENCES) */
  @Column({ type: 'jsonb', name: 'notification_preferences', nullable: true })
  notificationPreferences: NotificationPreferences | null;

  /** Trọng số chấm điểm CV mặc định của recruiter — job không tự set riêng sẽ dùng giá trị này thay vì MATCHING_WEIGHTS toàn cục */
  @Column({ type: 'jsonb', name: 'default_scoring_weights', nullable: true })
  defaultScoringWeights: MatchingWeights | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
