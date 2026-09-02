import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { User } from '../users/user.entity';
import { Job } from '../jobs/job.entity';

/** Tin tuyển dụng ứng viên bấm "Lưu tin" — mỗi (candidate, job) chỉ có 1 dòng. */
@Entity('saved_jobs')
@Unique(['candidateId', 'jobId'])
export class SavedJob {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'candidate_id', type: 'uuid' })
  candidateId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'candidate_id' })
  candidate!: User;

  @Column({ name: 'job_id', type: 'uuid' })
  jobId!: string;

  @ManyToOne(() => Job, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'job_id' })
  job!: Job;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
