import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm'
import { User } from '../users/user.entity'

@Entity('companies')
@Unique('uq_companies_recruiter_id', ['recruiterId'])
export class Company {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ name: 'recruiter_id', type: 'uuid' })
  recruiterId: string

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'recruiter_id' })
  recruiter: User

  // ── Thông tin cơ bản ──────────────────────────────────────────
  @Column({ type: 'varchar', length: 255 })
  name: string

  @Column({ type: 'varchar', name: 'short_name', length: 100, nullable: true })
  shortName: string | null

  @Column({ type: 'varchar', length: 255, nullable: true })
  tagline: string | null

  @Column({ type: 'varchar', name: 'logo_url', length: 500, nullable: true })
  logoUrl: string | null

  @Column({ type: 'varchar', name: 'cover_url', length: 500, nullable: true })
  coverUrl: string | null

  // ── Phân loại ─────────────────────────────────────────────────
  @Column({ type: 'varchar', length: 100, nullable: true })
  industry: string | null

  @Column({ type: 'varchar', name: 'company_type', length: 20, nullable: true })
  companyType: 'startup' | 'tnhh' | 'co_phan' | 'fdi' | 'tap_doan' | null

  @Column({ type: 'varchar', name: 'size_range', length: 20, nullable: true })
  sizeRange: '1-10' | '11-50' | '51-200' | '201-500' | '501-1000' | '1000+' | null

  @Column({ type: 'smallint', name: 'founded_year', nullable: true })
  foundedYear: number | null

  // ── Mô tả ─────────────────────────────────────────────────────
  @Column({ type: 'varchar', name: 'short_desc', length: 500, nullable: true })
  shortDesc: string | null

  @Column({ type: 'text', name: 'full_desc', nullable: true })
  fullDesc: string | null

  @Column({ type: 'varchar', name: 'work_model', length: 10, nullable: true })
  workModel: 'onsite' | 'hybrid' | 'remote' | null

  @Column({ type: 'varchar', name: 'work_language', length: 50, nullable: true })
  workLanguage: string | null

  // ── JSONB arrays ───────────────────────────────────────────────
  @Column({ type: 'jsonb', name: 'tech_stack', nullable: true })
  techStack: string[] | null

  @Column({ type: 'jsonb', nullable: true })
  perks: string[] | null

  // ── Liên hệ ───────────────────────────────────────────────────
  @Column({ type: 'text', nullable: true })
  address: string | null

  @Column({ type: 'varchar', length: 100, nullable: true })
  city: string | null

  @Column({ type: 'varchar', length: 500, nullable: true })
  website: string | null

  @Column({ type: 'varchar', name: 'linkedin_url', length: 500, nullable: true })
  linkedinUrl: string | null

  @Column({ type: 'varchar', name: 'facebook_url', length: 500, nullable: true })
  facebookUrl: string | null

  // ── Trạng thái ────────────────────────────────────────────────
  @Column({ type: 'boolean', name: 'is_published', default: false })
  isPublished: boolean

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date
}
