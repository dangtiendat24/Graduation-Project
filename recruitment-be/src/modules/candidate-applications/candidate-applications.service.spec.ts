import { NotFoundException } from '@nestjs/common'
import { Test, TestingModule } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { CandidateApplicationsService } from './candidate-applications.service'
import { Application } from '../applications/application.entity'
import { ApplicationStatusHistory } from '../applications/application-status-history.entity'

function createQueryBuilderMock(rawRow: unknown, rawRows: unknown[], count: number) {
  const qb: Record<string, jest.Mock> = {}
  const chainable = ['innerJoin', 'leftJoin', 'where', 'andWhere', 'select', 'addSelect', 'orderBy', 'offset', 'limit']
  chainable.forEach((method) => {
    qb[method] = jest.fn().mockReturnValue(qb)
  })
  qb.getCount = jest.fn().mockResolvedValue(count)
  qb.getRawMany = jest.fn().mockResolvedValue(rawRows)
  qb.getRawOne = jest.fn().mockResolvedValue(rawRow)
  return qb
}

const FULL_ROW = {
  applicationId: 'app-1',
  appliedAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-03T00:00:00.000Z'),
  status: 'interviewed',
  jobId: 'job-1',
  jobTitle: 'Backend Engineer',
  jobDepartment: 'Kỹ thuật',
  jobLevel: 'middle',
  jobLocation: 'Hà Nội',
  jobWorkModel: 'hybrid',
  jobSalaryRange: '20-30tr',
  companyName: 'Acme Corp',
  companyLogoUrl: 'https://cdn.example.com/logo.png',
  overallScore: '87.50',
  recommendation: 'strong_match',
  interviewStatus: 'completed',
  interviewOverallScore: '75.00',
  scheduleStatus: 'confirmed',
  scheduleConfirmedStartTime: new Date('2026-01-05T09:00:00.000Z'),
  scheduleMeetLink: 'https://meet.example.com/abc',
}

const EMPTY_JOIN_ROW = {
  applicationId: 'app-2',
  appliedAt: new Date('2026-01-02T00:00:00.000Z'),
  updatedAt: new Date('2026-01-02T00:00:00.000Z'),
  status: 'pending',
  jobId: 'job-2',
  jobTitle: 'Frontend Engineer',
  jobDepartment: null,
  jobLevel: null,
  jobLocation: null,
  jobWorkModel: null,
  jobSalaryRange: null,
  companyName: null,
  companyLogoUrl: null,
  overallScore: null,
  recommendation: null,
  interviewStatus: null,
  interviewOverallScore: null,
  scheduleStatus: null,
  scheduleConfirmedStartTime: null,
  scheduleMeetLink: null,
}

describe('CandidateApplicationsService', () => {
  let service: CandidateApplicationsService
  let appRepo: { createQueryBuilder: jest.Mock }
  let historyRepo: { find: jest.Mock }
  let qbMock: ReturnType<typeof createQueryBuilderMock>

  const CANDIDATE_ID = 'candidate-1'

  function setup(rawRow: unknown, rawRows: unknown[], count: number) {
    qbMock = createQueryBuilderMock(rawRow, rawRows, count)
    appRepo.createQueryBuilder.mockReturnValue(qbMock)
  }

  beforeEach(async () => {
    appRepo = { createQueryBuilder: jest.fn() }
    historyRepo = { find: jest.fn().mockResolvedValue([]) }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CandidateApplicationsService,
        { provide: getRepositoryToken(Application), useValue: appRepo },
        { provide: getRepositoryToken(ApplicationStatusHistory), useValue: historyRepo },
      ],
    }).compile()

    service = module.get<CandidateApplicationsService>(CandidateApplicationsService)
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })

  describe('getMyApplications', () => {
    it('chỉ lấy đơn của candidate đang đăng nhập', async () => {
      setup(undefined, [], 0)
      await service.getMyApplications(CANDIDATE_ID, {})
      expect(qbMock.where).toHaveBeenCalledWith('app.candidateId = :candidateId', {
        candidateId: CANDIDATE_ID,
      })
    })

    it('áp filter status khi có query.status', async () => {
      setup(undefined, [], 0)
      await service.getMyApplications(CANDIDATE_ID, { status: 'matched' })
      expect(qbMock.andWhere).toHaveBeenCalledWith('app.status = :status', { status: 'matched' })
    })

    it('map đầy đủ 1 row có matching/interview/schedule', async () => {
      setup(undefined, [FULL_ROW], 1)
      const result = await service.getMyApplications(CANDIDATE_ID, {})

      expect(result.data).toHaveLength(1)
      const item = result.data[0]
      expect(item.applicationId).toBe('app-1')
      expect(item.job.company).toEqual({ name: 'Acme Corp', logoUrl: 'https://cdn.example.com/logo.png' })
      expect(item.matching).toEqual({ overallScore: 87.5, recommendation: 'strong_match' })
      expect(item.interview).toEqual({ status: 'completed', overallScore: 75 })
      expect(item.schedule).toEqual({
        status: 'confirmed',
        confirmedStartTime: '2026-01-05T09:00:00.000Z',
        meetLink: 'https://meet.example.com/abc',
      })
      expect(item.autoRejected).toBeUndefined()
    })

    it('LEFT JOIN null (chưa có matching/interview/schedule) trả về null, không crash', async () => {
      setup(undefined, [EMPTY_JOIN_ROW], 1)
      const result = await service.getMyApplications(CANDIDATE_ID, {})

      const item = result.data[0]
      expect(item.job.company).toBeNull()
      expect(item.matching).toBeNull()
      expect(item.interview).toBeNull()
      expect(item.schedule).toBeNull()
    })

    it('gắn autoRejected = true khi status=rejected và overallScore < 30', async () => {
      setup(undefined, [{ ...FULL_ROW, status: 'rejected', overallScore: '15.00' }], 1)
      const result = await service.getMyApplications(CANDIDATE_ID, {})
      expect(result.data[0].autoRejected).toBe(true)
    })

    it('không gắn autoRejected khi status=rejected nhưng overallScore >= 30', async () => {
      setup(undefined, [{ ...FULL_ROW, status: 'rejected', overallScore: '45.00' }], 1)
      const result = await service.getMyApplications(CANDIDATE_ID, {})
      expect(result.data[0].autoRejected).toBeUndefined()
    })

    it('tính đúng phân trang (offset/limit + meta.totalPages), default limit = 10', async () => {
      setup(undefined, [], 25)
      const result = await service.getMyApplications(CANDIDATE_ID, { page: 2 })

      expect(qbMock.offset).toHaveBeenCalledWith(10)
      expect(qbMock.limit).toHaveBeenCalledWith(10)
      expect(result.meta).toEqual({ total: 25, page: 2, limit: 10, totalPages: 3 })
    })
  })

  describe('getApplicationDetail', () => {
    it('ném NotFoundException khi không tìm thấy đơn của candidate này', async () => {
      setup(undefined, [], 0)
      await expect(
        service.getApplicationDetail(CANDIDATE_ID, 'not-owned-app'),
      ).rejects.toThrow(NotFoundException)
    })

    it('lọc theo đúng candidateId + applicationId khi lấy chi tiết', async () => {
      setup(FULL_ROW, [], 0)
      await service.getApplicationDetail(CANDIDATE_ID, 'app-1')

      expect(qbMock.where).toHaveBeenCalledWith('app.candidateId = :candidateId', {
        candidateId: CANDIDATE_ID,
      })
      expect(qbMock.andWhere).toHaveBeenCalledWith('app.id = :applicationId', {
        applicationId: 'app-1',
      })
    })

    it('trả statusHistory sort theo changedAt ASC kèm label tiếng Việt', async () => {
      setup(FULL_ROW, [], 0)
      historyRepo.find.mockResolvedValue([
        {
          fromStatus: null,
          toStatus: 'pending',
          changedAt: new Date('2026-01-01T00:00:00.000Z'),
        },
        {
          fromStatus: 'pending',
          toStatus: 'matched',
          changedAt: new Date('2026-01-02T00:00:00.000Z'),
        },
      ])

      const result = await service.getApplicationDetail(CANDIDATE_ID, 'app-1')

      expect(historyRepo.find).toHaveBeenCalledWith({
        where: { applicationId: 'app-1' },
        order: { changedAt: 'ASC' },
      })
      expect(result.statusHistory).toEqual([
        {
          fromStatus: null,
          toStatus: 'pending',
          changedAt: '2026-01-01T00:00:00.000Z',
          label: 'Đã nộp đơn',
        },
        {
          fromStatus: 'pending',
          toStatus: 'matched',
          changedAt: '2026-01-02T00:00:00.000Z',
          label: 'Hồ sơ phù hợp',
        },
      ])
    })
  })
})
