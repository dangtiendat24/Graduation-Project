import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm'
import { User } from '../users/user.entity'
import { Job } from '../jobs/job.entity'

/** Phải khớp với APPLICATION_STATUSES trong packages/shared/scoring.constants.ts */
export type ApplicationStatus =
  | 'pending'
  | 'matched'
  | 'interviewed'
  | 'schedule_sent'
  | 'scheduled'
  | 'completed'
  | 'hired'
  | 'rejected'

@Entity('applications')
export class Application {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @Column({ name: 'candidate_id', type: 'uuid' })
  candidateId!: string

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'candidate_id' })
  candidate!: User

  @Column({ name: 'job_id', type: 'uuid' })
  jobId!: string

  @ManyToOne(() => Job, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'job_id' })
  job!: Job

  /** S3 URL của CV nộp cho tin tuyển dụng này */
  @Column({ type: 'varchar', name: 'cv_url', length: 1000 })
  cvUrl!: string

  @Column({ type: 'varchar', length: 20, default: 'pending' })
  status!: ApplicationStatus

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date
}
