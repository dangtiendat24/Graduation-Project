import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm'

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ type: 'varchar', unique: true, length: 255 })
  email: string

  @Column({ type: 'varchar', name: 'password_hash', length: 60, nullable: true })
  passwordHash: string | null

  @Column({ type: 'varchar', length: 20 })
  role: 'recruiter' | 'candidate'

  @Column({ type: 'varchar', name: 'full_name', length: 100 })
  fullName: string

  @Column({ type: 'varchar', length: 20, nullable: true })
  phone: string | null

  @Column({ type: 'varchar', name: 'avatar_url', nullable: true })
  avatarUrl: string | null

  @Column({ type: 'varchar', name: 'google_id', nullable: true, unique: true })
  googleId: string | null

  @Column({ type: 'boolean', name: 'is_active', default: false })
  isActive: boolean

  @Column({ type: 'varchar', name: 'email_verify_token', nullable: true, unique: true })
  emailVerifyToken: string | null

  @Column({ type: 'timestamptz', name: 'email_verify_expires', nullable: true })
  emailVerifyExpires: Date | null

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date
}
