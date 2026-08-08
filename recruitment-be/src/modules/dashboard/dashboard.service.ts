import { Inject, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import type { Redis } from 'ioredis';
import {
  APPLICATION_STATUSES,
  ApplicationStatus,
} from '@smart-recruitment/shared';
import { Application } from '../applications/application.entity';
import { MatchingResult } from '../applications/matching-result.entity';
import { DASHBOARD_REDIS_CLIENT } from './dashboard-redis.provider';
import { dashboardStatsCacheKey } from './dashboard-cache.service';

export interface ScoreBucket {
  /** vd "70-80" */
  range: string;
  count: number;
}

export interface SkillCount {
  skill: string;
  count: number;
}

export interface DashboardStatsResponse {
  totalScreened: number;
  statusFunnel: Record<ApplicationStatus, number>;
  avgTimeToInterviewDays: number | null;
  scoreDistribution: ScoreBucket[];
  topSkills: SkillCount[];
}

const CACHE_TTL_SECONDS = 5 * 60;
const TOP_SKILLS_LIMIT = 10;
const SCORE_BUCKET_WIDTH = 10;
const SCORE_BUCKET_MAX_START = 90;

@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);

  constructor(
    @InjectRepository(Application)
    private readonly appRepo: Repository<Application>,
    @InjectRepository(MatchingResult)
    private readonly matchingRepo: Repository<MatchingResult>,
    private readonly dataSource: DataSource,
    @Inject(DASHBOARD_REDIS_CLIENT)
    private readonly redis: Redis,
  ) {}

  async getStats(recruiterId: string): Promise<DashboardStatsResponse> {
    const cacheKey = this.cacheKey(recruiterId);
    const cached = await this.readCache(cacheKey);
    if (cached) {
      return cached;
    }

    const [
      totalScreened,
      statusFunnel,
      avgTimeToInterviewDays,
      scoreDistribution,
      topSkills,
    ] = await Promise.all([
      this.getTotalScreened(recruiterId),
      this.getStatusFunnel(recruiterId),
      this.getAvgTimeToInterviewDays(recruiterId),
      this.getScoreDistribution(recruiterId),
      this.getTopSkills(recruiterId),
    ]);

    const stats: DashboardStatsResponse = {
      totalScreened,
      statusFunnel,
      avgTimeToInterviewDays,
      scoreDistribution,
      topSkills,
    };

    await this.writeCache(cacheKey, stats);
    return stats;
  }

  /** Cache là tối ưu hiệu năng — Redis lỗi/không sẵn sàng không được làm hỏng response, chỉ bỏ qua cache. */
  private async readCache(
    cacheKey: string,
  ): Promise<DashboardStatsResponse | null> {
    try {
      const cached = await this.redis.get(cacheKey);
      return cached ? (JSON.parse(cached) as DashboardStatsResponse) : null;
    } catch (err) {
      this.logger.warn(
        `Bỏ qua cache đọc (Redis lỗi): ${(err as Error).message}`,
      );
      return null;
    }
  }

  private async writeCache(
    cacheKey: string,
    stats: DashboardStatsResponse,
  ): Promise<void> {
    try {
      await this.redis.set(
        cacheKey,
        JSON.stringify(stats),
        'EX',
        CACHE_TTL_SECONDS,
      );
    } catch (err) {
      this.logger.warn(
        `Bỏ qua cache ghi (Redis lỗi): ${(err as Error).message}`,
      );
    }
  }

  /** 1. Tổng số đơn ứng tuyển đã sàng lọc, scope theo các job của recruiter đang đăng nhập */
  async getTotalScreened(recruiterId: string): Promise<number> {
    return this.appRepo
      .createQueryBuilder('app')
      .innerJoin('app.job', 'job')
      .where('job.recruiterId = :recruiterId', { recruiterId })
      .getCount();
  }

  /** 2. Funnel theo status hiện tại của applications (GROUP BY status, không dùng history) */
  async getStatusFunnel(
    recruiterId: string,
  ): Promise<Record<ApplicationStatus, number>> {
    const rows = await this.appRepo
      .createQueryBuilder('app')
      .innerJoin('app.job', 'job')
      .where('job.recruiterId = :recruiterId', { recruiterId })
      .select('app.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('app.status')
      .getRawMany<{ status: ApplicationStatus; count: string }>();

    const funnel = Object.fromEntries(
      APPLICATION_STATUSES.map((status) => [status, 0]),
    ) as Record<ApplicationStatus, number>;
    for (const row of rows) {
      funnel[row.status] = parseInt(row.count, 10);
    }
    return funnel;
  }

  /**
   * 3. Thời gian TB (ngày) từ mốc nộp CV (occurrence đầu tiên chuyển sang 'pending') đến
   * mốc phỏng vấn (occurrence đầu tiên chuyển sang 'interviewed'), tính qua application_status_history.
   */
  async getAvgTimeToInterviewDays(recruiterId: string): Promise<number | null> {
    const raw = await this.dataSource
      .createQueryBuilder()
      .select(
        'AVG(EXTRACT(EPOCH FROM (iv."firstAt" - pd."firstAt")) / 86400)',
        'avgDays',
      )
      .from(
        (qb) =>
          qb
            .select('h.application_id', 'applicationId')
            .addSelect('MIN(h.changed_at)', 'firstAt')
            .from('application_status_history', 'h')
            .where('h.to_status = :pendingStatus', { pendingStatus: 'pending' })
            .groupBy('h.application_id'),
        'pd',
      )
      .innerJoin(
        (qb) =>
          qb
            .select('h.application_id', 'applicationId')
            .addSelect('MIN(h.changed_at)', 'firstAt')
            .from('application_status_history', 'h')
            .where('h.to_status = :interviewedStatus', {
              interviewedStatus: 'interviewed',
            })
            .groupBy('h.application_id'),
        'iv',
        'iv."applicationId" = pd."applicationId"',
      )
      .innerJoin('applications', 'app', 'app.id = pd."applicationId"')
      .innerJoin('jobs', 'job', 'job.id = app.job_id')
      .where('job.recruiter_id = :recruiterId', { recruiterId })
      .getRawOne<{ avgDays: string | null }>();

    return raw?.avgDays != null
      ? Math.round(parseFloat(raw.avgDays) * 100) / 100
      : null;
  }

  /** 4. Histogram điểm phù hợp (MatchingResult.overallScore) theo khoảng 10 điểm, 0-100 */
  async getScoreDistribution(recruiterId: string): Promise<ScoreBucket[]> {
    const rows = await this.matchingRepo
      .createQueryBuilder('match')
      .innerJoin('match.application', 'app')
      .innerJoin('app.job', 'job')
      .where('job.recruiterId = :recruiterId', { recruiterId })
      .select(
        `LEAST(FLOOR(match.overallScore / :bucketWidth) * :bucketWidth, :bucketMax)`,
        'bucketStart',
      )
      .addSelect('COUNT(*)', 'count')
      .setParameters({
        bucketWidth: SCORE_BUCKET_WIDTH,
        bucketMax: SCORE_BUCKET_MAX_START,
      })
      .groupBy('"bucketStart"')
      .orderBy('"bucketStart"', 'ASC')
      .getRawMany<{ bucketStart: string; count: string }>();

    const counts = new Map<number, number>();
    for (
      let start = 0;
      start <= SCORE_BUCKET_MAX_START;
      start += SCORE_BUCKET_WIDTH
    ) {
      counts.set(start, 0);
    }
    for (const row of rows) {
      counts.set(Number(row.bucketStart), parseInt(row.count, 10));
    }
    return Array.from(counts.entries()).map(([bucketStart, count]) => ({
      range: `${bucketStart}-${bucketStart + SCORE_BUCKET_WIDTH}`,
      count,
    }));
  }

  /**
   * 5. Top kỹ năng phổ biến — aggregate Application.parsedSkills (jsonb array).
   * parsedSkills là jsonb (không phải Postgres text[]/array column) nên dùng
   * jsonb_array_elements_text() thay vì unnest(); cần LATERAL join nên viết bằng SQL thô
   * qua DataSource thay vì QueryBuilder fluent API (QueryBuilder không hỗ trợ LATERAL).
   */
  async getTopSkills(
    recruiterId: string,
    limit = TOP_SKILLS_LIMIT,
  ): Promise<SkillCount[]> {
    const rows = await this.dataSource.query<
      { skill: string; count: string }[]
    >(
      `
      SELECT skill, COUNT(*)::int AS count
      FROM applications app
      INNER JOIN jobs job ON job.id = app.job_id
      CROSS JOIN LATERAL jsonb_array_elements_text(app.parsed_skills) AS skill
      WHERE job.recruiter_id = $1
        AND app.parsed_skills IS NOT NULL
      GROUP BY skill
      ORDER BY count DESC
      LIMIT $2
      `,
      [recruiterId, limit],
    );

    return rows.map((row) => ({ skill: row.skill, count: Number(row.count) }));
  }

  private cacheKey(recruiterId: string): string {
    return dashboardStatsCacheKey(recruiterId);
  }
}
