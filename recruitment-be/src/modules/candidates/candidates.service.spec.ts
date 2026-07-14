import { Test, TestingModule } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { CandidatesService } from './candidates.service'
import { Application } from '../applications/application.entity'
import { StorageService } from '../storage/storage.service'

function createQueryBuilderMock(rawRows: unknown[], count: number) {
  const qb: Record<string, jest.Mock> = {}
  const chainable = [
    'innerJoin',
    'leftJoin',
    'where',
    'andWhere',
    'select',
    'addSelect',
    'orderBy',
    'offset',
    'limit',
  ]
  chainable.forEach((method) => {
    qb[method] = jest.fn().mockReturnValue(qb)
  })
  qb.getCount = jest.fn().mockResolvedValue(count)
  qb.getRawMany = jest.fn().mockResolvedValue(rawRows)
  return qb
}

describe('CandidatesService', () => {
  let service: CandidatesService
  let storage: { getPresignedUrlForStoredUrl: jest.Mock }
  let qbMock: ReturnType<typeof createQueryBuilderMock>
  let appRepo: { createQueryBuilder: jest.Mock }

  const RECRUITER_ID = 'recruiter-1'

  function setup(rawRows: unknown[], count: number) {
    qbMock = createQueryBuilderMock(rawRows, count)
    appRepo.createQueryBuilder.mockReturnValue(qbMock)
  }

  beforeEach(async () => {
    appRepo = { createQueryBuilder: jest.fn() }
    storage = {
      getPresignedUrlForStoredUrl: jest.fn().mockResolvedValue('https://signed.example.com/cv.pdf'),
    }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CandidatesService,
        { provide: getRepositoryToken(Application), useValue: appRepo },
        { provide: StorageService, useValue: storage },
      ],
    }).compile()

    service = module.get<CandidatesService>(CandidatesService)
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })

  it('maps a fully-populated row (đã parse CV + đã có điểm matching)', async () => {
    setup(
      [
        {
          applicationId: 'app-1',
          appliedAt: new Date('2026-01-01T00:00:00.000Z'),
          status: 'matched',
          cvUrl: 'https://bucket.s3.region.amazonaws.com/applications/cand-1/job-1/cv.pdf',
          candidateId: 'cand-1',
          candidateFullName: 'Nguyễn Văn A',
          candidateEmail: 'a@example.com',
          candidatePhone: '0900000000',
          candidateAvatarUrl: null,
          candidateCity: 'Hà Nội',
          candidateLinkedinUrl: null,
          candidateGithubUrl: null,
          isParsed: true,
          parsedSummary: 'Backend engineer 3 năm kinh nghiệm',
          parsedSkills: ['Node.js', 'PostgreSQL'],
          parsedExperience: [],
          parsedEducation: [],
          overallScore: '87.50',
          recommendation: 'strong_match',
          criteria: { skills: 90, experience: 85, education: 80 },
          jobId: 'job-1',
          jobTitle: 'Backend Engineer',
          jobDepartment: 'Kỹ thuật',
        },
      ],
      1,
    )

    const result = await service.getCandidatesByRecruiter(RECRUITER_ID, {})

    expect(result.data).toHaveLength(1)
    const item = result.data[0]
    expect(item.isParsed).toBe(true)
    expect(item.parsedData).toEqual({
      summary: 'Backend engineer 3 năm kinh nghiệm',
      skills: ['Node.js', 'PostgreSQL'],
      experience: [],
      education: [],
    })
    expect(item.matching).toEqual({
      overallScore: 87.5,
      recommendation: 'strong_match',
      criteria: { skills: 90, experience: 85, education: 80 },
    })
    expect(item.cvFileUrl).toBe('https://signed.example.com/cv.pdf')
    expect(storage.getPresignedUrlForStoredUrl).toHaveBeenCalledWith(
      'https://bucket.s3.region.amazonaws.com/applications/cand-1/job-1/cv.pdf',
      300,
    )
    expect(result.meta).toEqual({ total: 1, page: 1, limit: 20, totalPages: 1 })
  })

  it('trả về parsedData = null khi is_parsed = false, kể cả khi có cột parsed lẻ tẻ', async () => {
    setup(
      [
        {
          applicationId: 'app-2',
          appliedAt: new Date('2026-01-02T00:00:00.000Z'),
          status: 'pending',
          cvUrl: null,
          candidateId: 'cand-2',
          candidateFullName: 'Trần Thị B',
          candidateEmail: 'b@example.com',
          candidatePhone: null,
          candidateAvatarUrl: null,
          candidateCity: null,
          candidateLinkedinUrl: null,
          candidateGithubUrl: null,
          isParsed: false,
          parsedSummary: null,
          parsedSkills: null,
          parsedExperience: null,
          parsedEducation: null,
          overallScore: null,
          recommendation: null,
          criteria: null,
          jobId: 'job-1',
          jobTitle: 'Backend Engineer',
          jobDepartment: null,
        },
      ],
      1,
    )

    const result = await service.getCandidatesByRecruiter(RECRUITER_ID, {})

    expect(result.data[0].isParsed).toBe(false)
    expect(result.data[0].parsedData).toBeNull()
    expect(result.data[0].matching).toBeNull()
    expect(result.data[0].cvFileUrl).toBeNull()
    expect(storage.getPresignedUrlForStoredUrl).not.toHaveBeenCalled()
  })

  it('áp filter job_id, status, search vào query builder', async () => {
    setup([], 0)

    await service.getCandidatesByRecruiter(RECRUITER_ID, {
      jobId: 'job-1',
      status: 'matched',
      search: 'nguyen',
    })

    expect(qbMock.where).toHaveBeenCalledWith('job.recruiterId = :recruiterId', {
      recruiterId: RECRUITER_ID,
    })
    expect(qbMock.andWhere).toHaveBeenCalledWith('app.jobId = :jobId', { jobId: 'job-1' })
    expect(qbMock.andWhere).toHaveBeenCalledWith('app.status = :status', { status: 'matched' })
    expect(qbMock.andWhere).toHaveBeenCalledWith(
      '(user.fullName ILIKE :search OR user.email ILIKE :search)',
      { search: '%nguyen%' },
    )
  })

  it('mặc định sort theo applied_at DESC, và NULLS LAST khi sort=overallScore', async () => {
    setup([], 0)
    await service.getCandidatesByRecruiter(RECRUITER_ID, {})
    expect(qbMock.orderBy).toHaveBeenCalledWith('app.createdAt', 'DESC')

    setup([], 0)
    await service.getCandidatesByRecruiter(RECRUITER_ID, { sort: 'overallScore' })
    expect(qbMock.orderBy).toHaveBeenCalledWith('match.overallScore', 'DESC', 'NULLS LAST')
  })

  it('tính đúng phân trang (offset/limit + meta.totalPages)', async () => {
    setup([], 45)

    const result = await service.getCandidatesByRecruiter(RECRUITER_ID, { page: 2, limit: 20 })

    expect(qbMock.offset).toHaveBeenCalledWith(20)
    expect(qbMock.limit).toHaveBeenCalledWith(20)
    expect(result.meta).toEqual({ total: 45, page: 2, limit: 20, totalPages: 3 })
  })
})
