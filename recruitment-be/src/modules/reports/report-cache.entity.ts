import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

/** 1 dòng = 1 PDF báo cáo đã render và upload lên Supabase Storage cho 1 application */
@Entity('report_cache')
export class ReportCache {
  @PrimaryColumn({ name: 'application_id', type: 'uuid' })
  applicationId!: string;

  /** Key lưu trong Supabase Storage (không phải URL — dùng StorageService.getSignedUrl để lấy URL) */
  @Column({ name: 'storage_key', type: 'varchar', length: 500 })
  storageKey!: string;

  /** MatchingResult.updatedAt tại thời điểm render — đổi thì coi cache stale, phải render lại */
  @Column({ name: 'source_updated_at', type: 'timestamptz' })
  sourceUpdatedAt!: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
