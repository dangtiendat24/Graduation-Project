import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
} from 'typeorm'
import { Application } from './application.entity'

export type MatchRecommendation = 'strong_match' | 'good_match' | 'partial_match' | 'poor_match'

export interface MatchingCriteria {
  skills: number
  experience: number
  education: number
}

/** Ghi lại bởi Agent 2 (CV-JD Matching) sau khi chấm điểm ứng viên cho một đơn ứng tuyển */
@Entity('matching_results')
export class MatchingResult {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @Column({ name: 'application_id', type: 'uuid' })
  applicationId!: string

  @OneToOne(() => Application, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'application_id' })
  application!: Application

  @Column({ name: 'overall_score', type: 'numeric', precision: 5, scale: 2 })
  overallScore!: number

  @Column({ type: 'varchar', length: 20 })
  recommendation!: MatchRecommendation

  @Column({ type: 'jsonb' })
  criteria!: MatchingCriteria

  @Column({ type: 'text', nullable: true })
  explanation!: string | null

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date
}
