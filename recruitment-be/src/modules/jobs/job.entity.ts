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
import { Company } from '../companies/company.entity'
import type { MatchingWeights } from '@smart-recruitment/shared'

@Entity('jobs')
export class Job {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ name: 'recruiter_id', type: 'uuid' })
  recruiterId: string

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'recruiter_id' })
  recruiter: User

  @Column({ name: 'company_id', type: 'uuid', nullable: true })
  companyId: string | null

  @ManyToOne(() => Company, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'company_id' })
  company: Company | null

  @Column({ type: 'varchar', length: 255 })
  title: string

  @Column({ type: 'varchar', length: 100, nullable: true })
  department: string | null

  @Column({ type: 'varchar', length: 20, nullable: true })
  level: 'intern' | 'junior' | 'middle' | 'senior' | 'lead' | 'director' | null

  @Column({ type: 'varchar', length: 255, nullable: true })
  location: string | null

  @Column({ type: 'smallint', default: 1 })
  headcount: number

  @Column({ type: 'varchar', name: 'work_model', length: 10, nullable: true })
  workModel: 'onsite' | 'hybrid' | 'remote' | null

  @Column({ type: 'text' })
  description: string

  @Column({ type: 'text' })
  requirements: string

  @Column({ type: 'jsonb', name: 'required_skills', nullable: true })
  requiredSkills: string[] | null

  @Column({ type: 'varchar', name: 'min_experience', length: 20, nullable: true })
  minExperience: string | null

  @Column({ type: 'varchar', name: 'salary_range', length: 100, nullable: true })
  salaryRange: string | null

  @Column({ type: 'jsonb', name: 'job_perks', nullable: true })
  jobPerks: string[] | null

  /** Trọng số chấm điểm riêng cho vị trí này (skills/experience/education, tổng = 1). Null → dùng MATCHING_WEIGHTS mặc định. */
  @Column({ type: 'jsonb', name: 'scoring_weights', nullable: true })
  scoringWeights: MatchingWeights | null

  @Column({ type: 'varchar', length: 20, default: 'draft' })
  status: 'draft' | 'active' | 'closed'

  @Column({ type: 'date', nullable: true })
  deadline: string | null

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date
}
