import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { RecruiterReportsService } from './recruiter-reports.service';
import { Application } from '../applications/application.entity';
import { ApplicationStatusHistory } from '../applications/application-status-history.entity';
import { Job } from '../jobs/job.entity';

function createQueryBuilderMock(rows: unknown[]) {
  const qb: Record<string, jest.Mock> = {};
  const chainable = [
    'innerJoin',
    'where',
    'andWhere',
    'orderBy',
    'addOrderBy',
    'select',
  ];
  chainable.forEach((method) => {
    qb[method] = jest.fn().mockReturnValue(qb);
  });
  qb.getMany = jest.fn().mockResolvedValue(rows);
  return qb;
}

const RECRUITER_ID = 'recruiter-1';
const JOB = { id: 'job-1', recruiterId: RECRUITER_ID, title: 'Backend Engineer' };

describe('RecruiterReportsService', () => {
  let service: RecruiterReportsService;
  let appRepo: { createQueryBuilder: jest.Mock };
  let historyRepo: { createQueryBuilder: jest.Mock };
  let jobRepo: { findOne: jest.Mock };

  function setup(applications: unknown[], history: unknown[]) {
    appRepo.createQueryBuilder.mockReturnValue(createQueryBuilderMock(applications));
    historyRepo.createQueryBuilder.mockReturnValue(createQueryBuilderMock(history));
  }

  beforeEach(async () => {
    appRepo = { createQueryBuilder: jest.fn() };
    historyRepo = { createQueryBuilder: jest.fn() };
    jobRepo = { findOne: jest.fn().mockResolvedValue(JOB) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RecruiterReportsService,
        { provide: getRepositoryToken(Application), useValue: appRepo },
        {
          provide: getRepositoryToken(ApplicationStatusHistory),
          useValue: historyRepo,
        },
        { provide: getRepositoryToken(Job), useValue: jobRepo },
      ],
    }).compile();

    service = module.get<RecruiterReportsService>(RecruiterReportsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('trả về báo cáo rỗng khi recruiter chưa có đơn ứng tuyển nào', async () => {
    setup([], []);
    const result = await service.getOverview(RECRUITER_ID, {});

    expect(result.headline).toEqual({
      totalScreened: 0,
      hiredCount: 0,
      rejectedCount: 0,
      inProgressCount: 0,
      avgTotalProcessingHours: null,
    });
    expect(result.funnel).toHaveLength(5);
    for (const stage of result.funnel) {
      expect(stage.entered).toBe(0);
      expect(stage.avgProcessingHours).toBeNull();
    }
  });

  it('đơn còn ở pending: entered=1 nhưng chưa có thời gian xử lý (không có history)', async () => {
    setup(
      [{ id: 'app-1', createdAt: new Date('2026-01-01T00:00:00Z'), status: 'pending' }],
      [],
    );
    const result = await service.getOverview(RECRUITER_ID, {});

    const pendingStage = result.funnel[0];
    expect(pendingStage.entered).toBe(1);
    expect(pendingStage.stillHere).toBe(1);
    expect(pendingStage.avgProcessingHours).toBeNull();
    expect(result.headline.totalScreened).toBe(1);
    expect(result.headline.inProgressCount).toBe(1);
  });

  it('matched -> schedule_sent (bỏ qua vòng phỏng vấn AI): ghi nhận directToSchedulingCount, không tính vào bucket "interviewed"', async () => {
    const createdAt = new Date('2026-01-01T00:00:00Z');
    setup(
      [{ id: 'app-1', createdAt, status: 'schedule_sent' }],
      [
        {
          applicationId: 'app-1',
          fromStatus: 'pending',
          toStatus: 'matched',
          changedAt: new Date('2026-01-01T02:00:00Z'),
        },
        {
          applicationId: 'app-1',
          fromStatus: 'matched',
          toStatus: 'schedule_sent',
          changedAt: new Date('2026-01-01T05:00:00Z'),
        },
      ],
    );
    const result = await service.getOverview(RECRUITER_ID, {});

    const matchedStage = result.funnel[1];
    const interviewedStage = result.funnel[2];
    const schedulingStage = result.funnel[3];

    expect(matchedStage.entered).toBe(1);
    expect(matchedStage.advancedCount).toBe(1);
    expect(matchedStage.directToSchedulingCount).toBe(1);
    expect(interviewedStage.entered).toBe(0);
    expect(schedulingStage.entered).toBe(1);
    expect(schedulingStage.stillHere).toBe(1);
  });

  it('ném ForbiddenException khi jobId không thuộc về recruiter', async () => {
    jobRepo.findOne.mockResolvedValue({ ...JOB, recruiterId: 'other-recruiter' });
    await expect(
      service.getOverview(RECRUITER_ID, { jobId: 'job-1' }),
    ).rejects.toThrow(ForbiddenException);
  });

  it('ném NotFoundException khi jobId không tồn tại', async () => {
    jobRepo.findOne.mockResolvedValue(null);
    await expect(
      service.getOverview(RECRUITER_ID, { jobId: 'job-1' }),
    ).rejects.toThrow(NotFoundException);
  });

  it('ném BadRequestException khi "from" sau "to"', async () => {
    await expect(
      service.getOverview(RECRUITER_ID, { from: '2026-02-01', to: '2026-01-01' }),
    ).rejects.toThrow(BadRequestException);
  });
});
