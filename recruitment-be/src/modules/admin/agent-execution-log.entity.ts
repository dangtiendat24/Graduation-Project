import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

export type AgentName =
  | 'agent1_resume_parser'
  | 'agent2_matching'
  | 'agent3_interview'
  | 'agent4_scheduling'
  | 'agent5_reporting';

export const AGENT_NAMES: AgentName[] = [
  'agent1_resume_parser',
  'agent2_matching',
  'agent3_interview',
  'agent4_scheduling',
  'agent5_reporting',
];

/** Nhật ký một lần thực thi của Agent (gọi ai-service) — phục vụ theo dõi hiệu suất/lỗi ở /admin/agent-stats */
@Entity('agent_execution_logs')
export class AgentExecutionLog {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'agent_name', type: 'varchar', length: 30 })
  agentName!: AgentName;

  /** Không phải log nào cũng gắn với 1 application (vd Agent 4 suggest-slots là truy vấn chung) */
  @Column({ name: 'application_id', type: 'uuid', nullable: true })
  applicationId!: string | null;

  @Column({ name: 'started_at', type: 'timestamptz' })
  startedAt!: Date;

  @Column({ name: 'duration_ms', type: 'integer' })
  durationMs!: number;

  @Column({ type: 'boolean' })
  success!: boolean;

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
