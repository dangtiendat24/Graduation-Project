import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { RecruiterApplicationsService } from './recruiter-applications.service';
import { Application } from '../applications/application.entity';
import { ApplicationStatusHistory } from '../applications/application-status-history.entity';
import { Job } from '../jobs/job.entity';
import { MailService } from '../mail/mail.service';

function createQueryBuilderMock(rawRows: unknown[], count: number) {
  const qb: Record<string, jest.Mock> = {};
  const chainable = [
    'innerJoin',
    'leftJoin',
    'where',
    'andWhere',
    'select',
    'addSelect',
    'orderBy',
    'addOrderBy',
    'offset',
    'limit',
  ];
  chainable.forEach((method) => {
    qb[method] = jest.fn().mockReturnValue(qb);
  });
  qb.getCount = jest.fn().mockResolvedValue(count);
  qb.getRawMany = jest.fn().mockResolvedValue(rawRows);
  return qb;
}

const JOB = {
  id: 'job-1',
  recruiterId: 'recruiter-1',
  title: 'Backend Engineer',
};

const ROW = {
  applicationId: 'app-1',
  appliedAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-02T00:00:00.000Z'),
  status: 'matched',
  candidateId: 'candidate-1',
  candidateFullName: 'Nguyen Van A',
  candidateEmail: 'a@example.com',
  candidatePhone: null,
  candidateAvatarUrl: null,
  overallScore: '87.50',
  recommendation: 'strong_match',
  criteria: { skills: 90, experience: 80, education: 85 },
  explanation: 'Phù hợp cao',
};

describe('RecruiterApplicationsService', () => {
  let service: RecruiterApplicationsService;
  let appRepo: {
    createQueryBuilder: jest.Mock;
    findOne: jest.Mock;
    save: jest.Mock;
  };
  let historyRepo: { create: jest.Mock; save: jest.Mock };
  let jobRepo: { findOne: jest.Mock };
  let mailService: {
    sendInterviewInviteEmail: jest.Mock;
    sendApplicationRejectedEmail: jest.Mock;
  };
  let qbMock: ReturnType<typeof createQueryBuilderMock>;

  const RECRUITER_ID = 'recruiter-1';

  function setupList(rawRows: unknown[], count: number) {
    qbMock = createQueryBuilderMock(rawRows, count);
    appRepo.createQueryBuilder.mockReturnValue(qbMock);
  }

  beforeEach(async () => {
    appRepo = {
      createQueryBuilder: jest.fn(),
      findOne: jest.fn(),
      save: jest.fn(),
    };
    historyRepo = {
      create: jest.fn((v: unknown) => v),
      save: jest.fn(),
    };
    jobRepo = { findOne: jest.fn().mockResolvedValue(JOB) };
    mailService = {
      sendInterviewInviteEmail: jest.fn(),
      sendApplicationRejectedEmail: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RecruiterApplicationsService,
        { provide: getRepositoryToken(Application), useValue: appRepo },
        {
          provide: getRepositoryToken(ApplicationStatusHistory),
          useValue: historyRepo,
        },
        { provide: getRepositoryToken(Job), useValue: jobRepo },
        { provide: MailService, useValue: mailService },
      ],
    }).compile();

    service = module.get<RecruiterApplicationsService>(
      RecruiterApplicationsService,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getJobApplications', () => {
    it('ném NotFoundException khi job không tồn tại', async () => {
      jobRepo.findOne.mockResolvedValue(null);
      await expect(
        service.getJobApplications(RECRUITER_ID, 'job-1', {}),
      ).rejects.toThrow(NotFoundException);
    });

    it('ném ForbiddenException khi job không thuộc về recruiter', async () => {
      jobRepo.findOne.mockResolvedValue({
        ...JOB,
        recruiterId: 'other-recruiter',
      });
      await expect(
        service.getJobApplications(RECRUITER_ID, 'job-1', {}),
      ).rejects.toThrow(ForbiddenException);
    });

    it('sắp xếp theo điểm giảm dần mặc định (sort=score)', async () => {
      setupList([ROW], 1);
      await service.getJobApplications(RECRUITER_ID, 'job-1', {});
      expect(qbMock.orderBy).toHaveBeenCalledWith(
        'match.overallScore',
        'DESC',
        'NULLS LAST',
      );
    });

    it('sắp xếp theo ngày nộp đơn khi sort=date', async () => {
      setupList([ROW], 1);
      await service.getJobApplications(RECRUITER_ID, 'job-1', { sort: 'date' });
      expect(qbMock.orderBy).toHaveBeenCalledWith('app.createdAt', 'DESC');
    });

    it('lọc theo scoreBand=high (>=80)', async () => {
      setupList([], 0);
      await service.getJobApplications(RECRUITER_ID, 'job-1', {
        scoreBand: 'high',
      });
      expect(qbMock.andWhere).toHaveBeenCalledWith(
        'match.overallScore >= :min',
        { min: 80 },
      );
    });

    it('lọc theo scoreBand=medium (60-79)', async () => {
      setupList([], 0);
      await service.getJobApplications(RECRUITER_ID, 'job-1', {
        scoreBand: 'medium',
      });
      expect(qbMock.andWhere).toHaveBeenCalledWith(
        'match.overallScore >= :min',
        { min: 60 },
      );
      expect(qbMock.andWhere).toHaveBeenCalledWith(
        'match.overallScore < :max',
        { max: 80 },
      );
    });

    it('lọc theo scoreBand=low (<60)', async () => {
      setupList([], 0);
      await service.getJobApplications(RECRUITER_ID, 'job-1', {
        scoreBand: 'low',
      });
      expect(qbMock.andWhere).toHaveBeenCalledWith(
        'match.overallScore < :max',
        { max: 60 },
      );
    });

    it('map đầy đủ 1 row có matching', async () => {
      setupList([ROW], 1);
      const result = await service.getJobApplications(
        RECRUITER_ID,
        'job-1',
        {},
      );
      expect(result.data[0]).toEqual({
        applicationId: 'app-1',
        appliedAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-02T00:00:00.000Z',
        status: 'matched',
        candidate: {
          id: 'candidate-1',
          fullName: 'Nguyen Van A',
          email: 'a@example.com',
          phone: null,
          avatarUrl: null,
        },
        matching: {
          overallScore: 87.5,
          recommendation: 'strong_match',
          criteria: { skills: 90, experience: 80, education: 85 },
          explanation: 'Phù hợp cao',
        },
      });
    });

    it('matching = null khi chưa có MatchingResult', async () => {
      setupList(
        [
          {
            ...ROW,
            overallScore: null,
            recommendation: null,
            criteria: null,
            explanation: null,
          },
        ],
        1,
      );
      const result = await service.getJobApplications(
        RECRUITER_ID,
        'job-1',
        {},
      );
      expect(result.data[0].matching).toBeNull();
    });

    it('tính đúng phân trang (offset/limit + meta.totalPages)', async () => {
      setupList([], 25);
      const result = await service.getJobApplications(RECRUITER_ID, 'job-1', {
        page: 2,
      });
      expect(qbMock.offset).toHaveBeenCalledWith(10);
      expect(qbMock.limit).toHaveBeenCalledWith(10);
      expect(result.meta).toEqual({
        total: 25,
        page: 2,
        limit: 10,
        totalPages: 3,
      });
    });
  });

  describe('updateStatus', () => {
    const APPLICATION = {
      id: 'app-1',
      status: 'matched',
      candidate: { email: 'a@example.com', fullName: 'Nguyen Van A' },
      job: { title: 'Backend Engineer' },
    };

    it('ném NotFoundException khi job không tồn tại', async () => {
      jobRepo.findOne.mockResolvedValue(null);
      await expect(
        service.updateStatus(RECRUITER_ID, 'job-1', 'app-1', {
          status: 'interviewed',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('ném ForbiddenException khi job không thuộc về recruiter', async () => {
      jobRepo.findOne.mockResolvedValue({
        ...JOB,
        recruiterId: 'other-recruiter',
      });
      await expect(
        service.updateStatus(RECRUITER_ID, 'job-1', 'app-1', {
          status: 'interviewed',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('ném NotFoundException khi không tìm thấy đơn ứng tuyển', async () => {
      appRepo.findOne.mockResolvedValue(null);
      await expect(
        service.updateStatus(RECRUITER_ID, 'job-1', 'app-1', {
          status: 'interviewed',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('ném BadRequestException khi chuyển trạng thái không hợp lệ theo state machine', async () => {
      appRepo.findOne.mockResolvedValue({ ...APPLICATION, status: 'hired' });
      await expect(
        service.updateStatus(RECRUITER_ID, 'job-1', 'app-1', {
          status: 'interviewed',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('chuyển matched -> interviewed, ghi lịch sử và gửi email mời phỏng vấn', async () => {
      appRepo.findOne.mockResolvedValue({ ...APPLICATION });
      appRepo.save.mockImplementation((v: unknown) => v);

      await service.updateStatus(RECRUITER_ID, 'job-1', 'app-1', {
        status: 'interviewed',
      });

      expect(appRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'interviewed' }),
      );
      expect(historyRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          applicationId: 'app-1',
          fromStatus: 'matched',
          toStatus: 'interviewed',
          changedBy: RECRUITER_ID,
        }),
      );
      expect(mailService.sendInterviewInviteEmail).toHaveBeenCalledWith(
        'a@example.com',
        'Nguyen Van A',
        'Backend Engineer',
      );
      expect(mailService.sendApplicationRejectedEmail).not.toHaveBeenCalled();
    });

    it('chuyển matched -> rejected, gửi email từ chối', async () => {
      appRepo.findOne.mockResolvedValue({ ...APPLICATION });
      appRepo.save.mockImplementation((v: unknown) => v);

      await service.updateStatus(RECRUITER_ID, 'job-1', 'app-1', {
        status: 'rejected',
      });

      expect(mailService.sendApplicationRejectedEmail).toHaveBeenCalledWith(
        'a@example.com',
        'Nguyen Van A',
        'Backend Engineer',
      );
      expect(mailService.sendInterviewInviteEmail).not.toHaveBeenCalled();
    });

    it('không gửi email khi chuyển sang trạng thái không thuộc danh sách thông báo', async () => {
      appRepo.findOne.mockResolvedValue({ ...APPLICATION, status: 'pending' });
      appRepo.save.mockImplementation((v: unknown) => v);

      await service.updateStatus(RECRUITER_ID, 'job-1', 'app-1', {
        status: 'matched',
      });

      expect(mailService.sendInterviewInviteEmail).not.toHaveBeenCalled();
      expect(mailService.sendApplicationRejectedEmail).not.toHaveBeenCalled();
    });
  });
});
