import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

/** OAuth token của recruiter cho Google Calendar (agent4_scheduling) — mỗi user tối đa 1 kết nối */
@Entity('google_calendar_credentials')
export class GoogleCalendarCredential {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'user_id', type: 'uuid', unique: true })
  userId!: string;

  @Column({ name: 'access_token', type: 'text' })
  accessToken!: string;

  @Column({ name: 'refresh_token', type: 'text' })
  refreshToken!: string;

  @Column({ name: 'expiry_date', type: 'timestamptz' })
  expiryDate!: Date;

  @Column({ type: 'varchar', length: 500 })
  scope!: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
