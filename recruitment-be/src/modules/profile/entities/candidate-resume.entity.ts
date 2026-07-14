import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Unique,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm'
import { User } from '../../users/user.entity'

export interface ExperienceItem {
  title: string
  company: string
  period: string
  description: string
}

export interface EduItem {
  school: string
  degree: string
  year: string
}

export type ParseStatus = 'pending' | 'processing' | 'done' | 'error'

@Entity('candidate_resumes')
@Unique('uq_candidate_resumes_candidate_id', ['candidateId'])
export class CandidateResume {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ name: 'candidate_id', type: 'uuid' })
  candidateId: string

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'candidate_id' })
  candidate: User

  /** S3 object key */
  @Column({ type: 'varchar', name: 'cv_file_name', length: 255 })
  cvFileName: string

  /** Original filename as uploaded by the user */
  @Column({ type: 'varchar', name: 'cv_original_name', length: 255 })
  cvOriginalName: string

  /** Public S3 URL */
  @Column({ type: 'varchar', name: 'cv_url', length: 1000 })
  cvUrl: string

  @Column({ type: 'int', name: 'cv_size_bytes' })
  cvSizeBytes: number

  /* ── AI-parsed data (populated by AI service callback) ── */
  @Column({ type: 'text', name: 'parsed_summary', nullable: true })
  parsedSummary: string | null

  @Column({ type: 'jsonb', name: 'parsed_skills', nullable: true })
  parsedSkills: string[] | null

  @Column({ type: 'jsonb', name: 'parsed_experience', nullable: true })
  parsedExperience: ExperienceItem[] | null

  @Column({ type: 'jsonb', name: 'parsed_education', nullable: true })
  parsedEducation: EduItem[] | null

  @Column({ type: 'boolean', name: 'is_analyzed', default: false })
  isAnalyzed: boolean

  @Column({ type: 'varchar', name: 'parse_status', length: 20, default: 'pending' })
  parseStatus: ParseStatus

  @Column({ type: 'timestamptz', name: 'parsed_at', nullable: true })
  parsedAt: Date | null

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date
}
