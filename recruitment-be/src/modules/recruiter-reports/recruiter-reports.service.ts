import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { Application } from '../applications/application.entity';
import type { ApplicationStatus } from '../applications/application.entity';
import { ApplicationStatusHistory } from '../applications/application-status-history.entity';
import { Job } from '../jobs/job.entity';
import { GetReportsOverviewQueryDto } from './dto/get-reports-overview-query.dto';

/** Vòng tuyển dụng (funnel bucket) — nhiều ApplicationStatus có thể gộp vào cùng 1 vòng hiển thị */
const STATUS_TO_BUCKET: Record<ApplicationStatus, number | null> = {
  pending: 0,
  matched: 1,
  interviewed: 2,
  schedule_sent: 3,
  scheduled: 3,
  completed: 3,
  hired: 4,
  rejected: null,
};

const BUCKET_META = [
  { stage: 'pending', label: 'Vừa nộp đơn' },
  { stage: 'matched', label: 'AI đã chấm điểm' },
  { stage: 'interviewed', label: 'Phỏng vấn AI' },
  { stage: 'scheduling', label: 'Chờ lịch / đã hẹn' },
  { stage: 'hired', label: 'Đã tuyển' },
] as const;

const MATCHED_BUCKET = 1;
const SCHEDULING_BUCKET = 3;
const MS_PER_HOUR = 3_600_000;

interface Segment {
  bucket: number;
  enteredAt: Date;
  exitType: 'advanced' | 'rejected' | 'open';
  exitedAt: Date | null;
  advancedToBucket: number | null;
}

interface BucketAccumulator {
  entered: number;
  advancedCount: number;
  rejectedCount: number;
  stillHere: number;
  processedCount: number;
  totalProcessingMs: number;
  directToSchedulingCount: number;
}

export interface FunnelStage {
  stage: string;
  label: string;
  entered: number;
  advancedCount: number | null;
  rejectedCount: number | null;
  stillHere: number | null;
  passRate: number | null;
  avgProcessingHours: number | null;
  directToSchedulingCount?: number;
}

export interface ReportsOverviewResponse {
  scope: {
    jobId: string | null;
    jobTitle: string | null;
    from: string | null;
    to: string | null;
  };
  headline: {
    totalScreened: number;
    hiredCount: number;
    rejectedCount: number;
    inProgressCount: number;
    avgTotalProcessingHours: number | null;
  };
  funnel: FunnelStage[];
}

function emptyAccumulator(): BucketAccumulator {
  return {
    entered: 0,
    advancedCount: 0,
    rejectedCount: 0,
    stillHere: 0,
    processedCount: 0,
    totalProcessingMs: 0,
    directToSchedulingCount: 0,
  };
}

@Injectable()
export class RecruiterReportsService {
  constructor(
    @InjectRepository(Application)
    private readonly appRepo: Repository<Application>,
    @InjectRepository(ApplicationStatusHistory)
    private readonly historyRepo: Repository<ApplicationStatusHistory>,
    @InjectRepository(Job)
    private readonly jobRepo: Repository<Job>,
  ) {}

  async getOverview(
    recruiterId: string,
    query: GetReportsOverviewQueryDto,
  ): Promise<ReportsOverviewResponse> {
    const { jobId, from, to } = query;

    if (from && to && new Date(from) > new Date(to)) {
      throw new BadRequestException(
        'Khoảng thời gian không hợp lệ: "from" phải trước "to"',
      );
    }

    let jobTitle: string | null = null;
    if (jobId) {
      const job = await this.findOwnedJob(recruiterId, jobId);
      jobTitle = job.title;
    }

    const appQb = this.appRepo
      .createQueryBuilder('app')
      .innerJoin('app.job', 'job')
      .select(['app.id', 'app.createdAt', 'app.status']);
    this.applyScopeFilters(appQb, recruiterId, jobId, from, to);
    const applications = await appQb.getMany();

    const historyQb = this.historyRepo
      .createQueryBuilder('h')
      .innerJoin('h.application', 'app')
      .innerJoin('app.job', 'job')
      .orderBy('h.applicationId', 'ASC')
      .addOrderBy('h.changedAt', 'ASC')
      .select(['h.applicationId', 'h.fromStatus', 'h.toStatus', 'h.changedAt']);
    this.applyScopeFilters(historyQb, recruiterId, jobId, from, to);
    const history = await historyQb.getMany();

    const historyByApp = new Map<string, ApplicationStatusHistory[]>();
    for (const row of history) {
      const list = historyByApp.get(row.applicationId) ?? [];
      list.push(row);
      historyByApp.set(row.applicationId, list);
    }

    const buckets = BUCKET_META.map(() => emptyAccumulator());
    let hiredCount = 0;
    let rejectedCount = 0;
    let terminalProcessingMs = 0;
    let terminalCount = 0;

    for (const app of applications) {
      const historyForApp = historyByApp.get(app.id) ?? [];

      for (const segment of buildSegments(app.createdAt, historyForApp)) {
        const agg = buckets[segment.bucket];
        agg.entered += 1;

        if (segment.exitType === 'advanced') {
          agg.advancedCount += 1;
          agg.processedCount += 1;
          agg.totalProcessingMs +=
            segment.exitedAt!.getTime() - segment.enteredAt.getTime();
          if (
            segment.bucket === MATCHED_BUCKET &&
            segment.advancedToBucket === SCHEDULING_BUCKET
          ) {
            agg.directToSchedulingCount += 1;
          }
        } else if (segment.exitType === 'rejected') {
          agg.rejectedCount += 1;
          agg.processedCount += 1;
          agg.totalProcessingMs +=
            segment.exitedAt!.getTime() - segment.enteredAt.getTime();
        } else {
          agg.stillHere += 1;
        }
      }

      if (app.status === 'hired') hiredCount += 1;
      if (app.status === 'rejected') rejectedCount += 1;
      if (
        (app.status === 'hired' || app.status === 'rejected') &&
        historyForApp.length > 0
      ) {
        const terminal = historyForApp[historyForApp.length - 1];
        terminalProcessingMs +=
          terminal.changedAt.getTime() - app.createdAt.getTime();
        terminalCount += 1;
      }
    }

    const funnel: FunnelStage[] = BUCKET_META.map((meta, i) => {
      const agg = buckets[i];
      const isTerminalBucket = i === BUCKET_META.length - 1;
      const passRate =
        !isTerminalBucket && agg.entered > 0
          ? agg.advancedCount / agg.entered
          : null;
      const avgProcessingHours =
        !isTerminalBucket && agg.processedCount > 0
          ? agg.totalProcessingMs / agg.processedCount / MS_PER_HOUR
          : null;

      const base: FunnelStage = {
        stage: meta.stage,
        label: meta.label,
        entered: agg.entered,
        advancedCount: isTerminalBucket ? null : agg.advancedCount,
        rejectedCount: isTerminalBucket ? null : agg.rejectedCount,
        stillHere: isTerminalBucket ? null : agg.stillHere,
        passRate,
        avgProcessingHours,
      };

      if (i === MATCHED_BUCKET) {
        base.directToSchedulingCount = agg.directToSchedulingCount;
      }

      return base;
    });

    return {
      scope: {
        jobId: jobId ?? null,
        jobTitle,
        from: from ?? null,
        to: to ?? null,
      },
      headline: {
        totalScreened: applications.length,
        hiredCount,
        rejectedCount,
        inProgressCount: applications.length - hiredCount - rejectedCount,
        avgTotalProcessingHours:
          terminalCount > 0
            ? terminalProcessingMs / terminalCount / MS_PER_HOUR
            : null,
      },
      funnel,
    };
  }

  /** Giới hạn 1 query builder (đã join tới `job`) về đúng phạm vi recruiter/job/khoảng ngày */
  private applyScopeFilters<T extends object>(
    qb: SelectQueryBuilder<T>,
    recruiterId: string,
    jobId?: string,
    from?: string,
    to?: string,
  ): void {
    qb.where('job.recruiterId = :recruiterId', { recruiterId });
    if (jobId) qb.andWhere('app.jobId = :jobId', { jobId });
    if (from) qb.andWhere('app.createdAt >= :from', { from });
    if (to) qb.andWhere('app.createdAt <= :to', { to });
  }

  private async findOwnedJob(recruiterId: string, jobId: string): Promise<Job> {
    const job = await this.jobRepo.findOne({ where: { id: jobId } });
    if (!job) {
      throw new NotFoundException('Không tìm thấy tin tuyển dụng');
    }
    if (job.recruiterId !== recruiterId) {
      throw new ForbiddenException(
        'Bạn không có quyền xem báo cáo của tin tuyển dụng này',
      );
    }
    return job;
  }
}

/**
 * Dựng timeline vòng tuyển dụng của 1 đơn ứng tuyển từ trạng thái ban đầu (pending, tại createdAt)
 * và lịch sử chuyển trạng thái, gộp các bước liên tiếp cùng 1 vòng thành 1 segment duy nhất.
 */
function buildSegments(
  createdAt: Date,
  historyForApp: ApplicationStatusHistory[],
): Segment[] {
  const events: { bucket: number | null; at: Date }[] = [
    { bucket: STATUS_TO_BUCKET.pending, at: createdAt },
  ];
  for (const row of historyForApp) {
    events.push({ bucket: STATUS_TO_BUCKET[row.toStatus], at: row.changedAt });
  }

  const segments: Segment[] = [];
  let current: { bucket: number; enteredAt: Date } | null = null;

  for (const ev of events) {
    if (ev.bucket === null) {
      if (current) {
        segments.push({
          bucket: current.bucket,
          enteredAt: current.enteredAt,
          exitType: 'rejected',
          exitedAt: ev.at,
          advancedToBucket: null,
        });
        current = null;
      }
      continue;
    }

    if (current === null) {
      current = { bucket: ev.bucket, enteredAt: ev.at };
    } else if (ev.bucket === current.bucket) {
      continue;
    } else {
      segments.push({
        bucket: current.bucket,
        enteredAt: current.enteredAt,
        exitType: 'advanced',
        exitedAt: ev.at,
        advancedToBucket: ev.bucket,
      });
      current = { bucket: ev.bucket, enteredAt: ev.at };
    }
  }

  if (current) {
    segments.push({
      bucket: current.bucket,
      enteredAt: current.enteredAt,
      exitType: 'open',
      exitedAt: null,
      advancedToBucket: null,
    });
  }

  return segments;
}
