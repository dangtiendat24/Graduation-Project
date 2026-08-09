import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import {
  AGENT_NAMES,
  AgentExecutionLog,
  AgentName,
} from './agent-execution-log.entity';

const RECENT_ERRORS_LIMIT = 10;

export interface RecentAgentError {
  errorMessage: string;
  createdAt: Date;
}

export interface AgentStatsItem {
  agentName: AgentName;
  totalExecutions: number;
  avgDurationMs: number | null;
  successRate: number | null;
  recentErrors: RecentAgentError[];
}

export interface AgentActivityItem {
  id: string;
  agentName: AgentName;
  startedAt: Date;
  success: boolean;
  errorMessage: string | null;
  candidateName: string;
  jobTitle: string;
}

const RECENT_ACTIVITY_LIMIT = 10;

@Injectable()
export class AdminAgentStatsService {
  constructor(
    @InjectRepository(AgentExecutionLog)
    private readonly logRepo: Repository<AgentExecutionLog>,
    private readonly dataSource: DataSource,
  ) {}

  async getStats(): Promise<AgentStatsItem[]> {
    const [aggregates, recentErrorsByAgent] = await Promise.all([
      this.getAggregates(),
      this.getRecentErrors(),
    ]);

    return AGENT_NAMES.map((agentName) => {
      const aggregate = aggregates.get(agentName);
      return {
        agentName,
        totalExecutions: aggregate?.totalExecutions ?? 0,
        avgDurationMs: aggregate?.avgDurationMs ?? null,
        successRate: aggregate?.successRate ?? null,
        recentErrors: recentErrorsByAgent.get(agentName) ?? [],
      };
    });
  }

  /**
   * Feed hoạt động Agent gần nhất, chỉ gồm log đã gắn với 1 application thuộc job của
   * đúng recruiter đang xem (INNER JOIN, không show log applicationId=null của recruiter khác).
   */
  async getRecentActivity(
    recruiterId: string,
    limit = RECENT_ACTIVITY_LIMIT,
  ): Promise<AgentActivityItem[]> {
    const rows = await this.dataSource.query<
      {
        id: string;
        agentName: AgentName;
        startedAt: Date;
        success: boolean;
        errorMessage: string | null;
        candidateName: string;
        jobTitle: string;
      }[]
    >(
      `
      SELECT
        log.id AS "id",
        log.agent_name AS "agentName",
        log.started_at AS "startedAt",
        log.success AS "success",
        log.error_message AS "errorMessage",
        u.full_name AS "candidateName",
        j.title AS "jobTitle"
      FROM agent_execution_logs log
      INNER JOIN applications app ON app.id = log.application_id
      INNER JOIN jobs j ON j.id = app.job_id
      INNER JOIN users u ON u.id = app.candidate_id
      WHERE j.recruiter_id = $1
      ORDER BY log.started_at DESC
      LIMIT $2
      `,
      [recruiterId, limit],
    );
    return rows;
  }

  private async getAggregates(): Promise<
    Map<
      AgentName,
      { totalExecutions: number; avgDurationMs: number; successRate: number }
    >
  > {
    const rows = await this.logRepo
      .createQueryBuilder('log')
      .select('log.agentName', 'agentName')
      .addSelect('COUNT(*)', 'total')
      .addSelect('AVG(log.durationMs)', 'avgDurationMs')
      .addSelect('SUM(CASE WHEN log.success THEN 1 ELSE 0 END)', 'successCount')
      .groupBy('log.agentName')
      .getRawMany<{
        agentName: AgentName;
        total: string;
        avgDurationMs: string;
        successCount: string;
      }>();

    const map = new Map<
      AgentName,
      { totalExecutions: number; avgDurationMs: number; successRate: number }
    >();
    for (const row of rows) {
      const total = parseInt(row.total, 10);
      map.set(row.agentName, {
        totalExecutions: total,
        avgDurationMs: Math.round(parseFloat(row.avgDurationMs) * 100) / 100,
        successRate:
          total === 0
            ? 0
            : Math.round((parseInt(row.successCount, 10) / total) * 10000) /
              10000,
      });
    }
    return map;
  }

  /** Lấy tối đa RECENT_ERRORS_LIMIT log lỗi gần nhất, riêng cho từng agentName (window function) */
  private async getRecentErrors(): Promise<Map<AgentName, RecentAgentError[]>> {
    const rows = await this.dataSource.query<
      { agent_name: AgentName; error_message: string; created_at: Date }[]
    >(
      `
      SELECT agent_name, error_message, created_at
      FROM (
        SELECT
          agent_name,
          error_message,
          created_at,
          ROW_NUMBER() OVER (PARTITION BY agent_name ORDER BY created_at DESC) AS rn
        FROM agent_execution_logs
        WHERE success = false
      ) ranked
      WHERE rn <= $1
      ORDER BY agent_name, created_at DESC
      `,
      [RECENT_ERRORS_LIMIT],
    );

    const map = new Map<AgentName, RecentAgentError[]>();
    for (const row of rows) {
      const list = map.get(row.agent_name) ?? [];
      list.push({ errorMessage: row.error_message, createdAt: row.created_at });
      map.set(row.agent_name, list);
    }
    return map;
  }
}
