import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { VALID_TRANSITIONS } from '@smart-recruitment/shared';
import { Application, ApplicationStatus } from './application.entity';
import { ApplicationStatusHistory } from './application-status-history.entity';
import { Job } from '../jobs/job.entity';
import { User } from '../users/user.entity';
import { Schedule, ScheduleStatus, ProposedSlot } from './schedule.entity';
import { GoogleCalendarService } from '../google-calendar/google-calendar.service';
import { MailService } from '../mail/mail.service';
import { DashboardCacheService } from '../dashboard/dashboard-cache.service';
import { shouldNotify } from '../settings/notification-preferences';

const VN_TIMEZONE = 'Asia/Ho_Chi_Minh';

/** Các trạng thái đơn ứng tuyển từ lúc mời phỏng vấn trở đi — liên quan đến trang "Lịch phỏng vấn" */
const INTERVIEW_RELATED_STATUSES: ApplicationStatus[] = [
  'interviewed',
  'schedule_sent',
  'scheduled',
  'completed',
];

export interface RecruiterScheduleListItem {
  jobId: string;
  jobTitle: string;
  applicationId: string;
  applicationStatus: ApplicationStatus;
  candidateId: string;
  candidateName: string;
  candidateEmail: string;
  schedule: {
    status: ScheduleStatus;
    proposedSlots: ProposedSlot[] | null;
    confirmedStartTime: string | null;
    confirmedEndTime: string | null;
    meetLink: string | null;
  } | null;
}

@Injectable()
export class ScheduleService {
  private readonly logger = new Logger(ScheduleService.name);

  constructor(
    @InjectRepository(Schedule)
    private readonly scheduleRepo: Repository<Schedule>,
    @InjectRepository(Application)
    private readonly appRepo: Repository<Application>,
    @InjectRepository(ApplicationStatusHistory)
    private readonly historyRepo: Repository<ApplicationStatusHistory>,
    @InjectRepository(Job)
    private readonly jobRepo: Repository<Job>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly googleCalendarService: GoogleCalendarService,
    private readonly mailService: MailService,
    private readonly dashboardCache: DashboardCacheService,
  ) {}

  /**
   * Recruiter mời phỏng vấn + gửi 1-5 khung giờ đề xuất cho ứng viên trong 1 thao tác duy nhất —
   * application chuyển thẳng 'matched' (hoặc 'interviewed') → 'schedule_sent'. Gộp 2 bước "mời"
   * và "gửi lịch" thành 1 để ứng viên chỉ nhận đúng 1 email mời kèm khung giờ cụ thể, thay vì
   * 1 email mời chung chung rồi mới có email khung giờ sau.
   *
   * Cũng cho phép gọi lại khi đơn đã ở 'schedule_sent' nhưng ứng viên CHƯA xác nhận (schedule.status
   * vẫn 'pending') — recruiter sửa/gửi lại khung giờ khác, đề xuất cũ bị thay thế. Không transition
   * lại trạng thái (đã đúng 'schedule_sent' từ trước) và ứng viên nhận email "cập nhật khung giờ"
   * thay vì email mời lần đầu.
   */
  async proposeSlots(
    recruiterId: string,
    jobId: string,
    applicationId: string,
    slots: ProposedSlot[],
  ): Promise<Schedule> {
    const job = await this.findOwnedJob(recruiterId, jobId);
    const application = await this.appRepo.findOne({
      where: { id: applicationId, jobId },
      relations: ['candidate'],
    });
    if (!application) {
      throw new NotFoundException('Không tìm thấy đơn ứng tuyển');
    }

    const isResend = application.status === 'schedule_sent';
    if (
      !isResend &&
      !VALID_TRANSITIONS[application.status].includes('schedule_sent')
    ) {
      throw new BadRequestException(
        `Không thể gửi lịch phỏng vấn khi đơn đang ở trạng thái "${application.status}"`,
      );
    }
    this.assertValidSlots(slots);

    const calendarStatus =
      await this.googleCalendarService.getStatus(recruiterId);
    if (!calendarStatus.connected) {
      throw new BadRequestException(
        'Bạn chưa kết nối Google Calendar — vui lòng kết nối trước khi gửi khung giờ phỏng vấn cho ứng viên',
      );
    }

    let schedule = await this.scheduleRepo.findOne({
      where: { applicationId },
    });
    if (!schedule) {
      schedule = this.scheduleRepo.create({ applicationId });
    }
    schedule.status = 'pending';
    schedule.proposedSlots = slots;
    schedule.confirmedStartTime = null;
    schedule.confirmedEndTime = null;
    schedule.meetLink = null;
    const saved = await this.scheduleRepo.save(schedule);

    if (!isResend) {
      await this.transitionApplication(
        application,
        'schedule_sent',
        recruiterId,
        recruiterId,
      );
    }

    await this.mailService.sendScheduleProposedEmail(
      application.candidate.email,
      application.candidate.fullName,
      job.title,
      slots.length,
      isResend,
    );

    return saved;
  }

  /** Ứng viên xác nhận 1 khung giờ đã được đề xuất — tạo Google Calendar event + Meet link */
  async confirmSlot(
    candidateId: string,
    applicationId: string,
    selected: ProposedSlot,
  ): Promise<Schedule> {
    const application = await this.appRepo.findOne({
      where: { id: applicationId, candidateId },
      relations: ['candidate', 'job'],
    });
    if (!application) {
      throw new NotFoundException('Không tìm thấy đơn ứng tuyển');
    }
    if (!VALID_TRANSITIONS[application.status].includes('scheduled')) {
      throw new BadRequestException(
        `Không thể xác nhận lịch khi đơn đang ở trạng thái "${application.status}"`,
      );
    }

    const schedule = await this.scheduleRepo.findOne({
      where: { applicationId },
    });
    if (!schedule || schedule.status !== 'pending') {
      throw new NotFoundException(
        'Chưa có khung giờ nào được đề xuất cho đơn ứng tuyển này',
      );
    }

    const matched = (schedule.proposedSlots ?? []).find(
      (s) =>
        new Date(s.start).getTime() === new Date(selected.start).getTime() &&
        new Date(s.end).getTime() === new Date(selected.end).getTime(),
    );
    if (!matched) {
      throw new BadRequestException(
        'Khung giờ chọn không nằm trong danh sách đã được đề xuất',
      );
    }

    const { meetLink } = await this.googleCalendarService.createEvent(
      application.job.recruiterId,
      {
        summary: `Phỏng vấn - ${application.candidate.fullName} - ${application.job.title}`,
        description: `Buổi phỏng vấn ứng tuyển vị trí ${application.job.title} trên RecruitAI.`,
        startISO: matched.start,
        endISO: matched.end,
        attendeeEmails: [application.candidate.email],
      },
    );

    schedule.status = 'confirmed';
    schedule.confirmedStartTime = new Date(matched.start);
    schedule.confirmedEndTime = new Date(matched.end);
    schedule.meetLink = meetLink;
    const saved = await this.scheduleRepo.save(schedule);

    await this.transitionApplication(
      application,
      'scheduled',
      candidateId,
      application.job.recruiterId,
    );

    const scheduledTimeLabel = this.formatScheduledTime(
      saved.confirmedStartTime!,
      saved.confirmedEndTime!,
    );

    await this.mailService.sendScheduleConfirmedEmail(
      application.candidate.email,
      application.candidate.fullName,
      application.job.title,
      scheduledTimeLabel,
      meetLink ?? '',
    );

    await this.notifyRecruiterScheduleConfirmed(
      application.job.recruiterId,
      application.candidate.fullName,
      application.job.title,
      scheduledTimeLabel,
    );

    return saved;
  }

  /** Không để lỗi gửi mail làm hỏng luồng xác nhận lịch chính — chỉ log lại nếu thất bại */
  private async notifyRecruiterScheduleConfirmed(
    recruiterId: string,
    candidateName: string,
    jobTitle: string,
    scheduledTimeLabel: string,
  ): Promise<void> {
    try {
      const recruiter = await this.userRepo.findOne({
        where: { id: recruiterId },
      });
      if (
        !recruiter ||
        !shouldNotify(recruiter.notificationPreferences, 'scheduleConfirmed')
      ) {
        return;
      }
      await this.mailService.sendRecruiterScheduleConfirmedEmail(
        recruiter.email,
        recruiter.fullName,
        candidateName,
        jobTitle,
        scheduledTimeLabel,
      );
    } catch (err) {
      this.logger.error(
        `Gửi email thông báo xác nhận lịch thất bại: ${(err as Error).message}`,
      );
    }
  }

  private formatScheduledTime(start: Date, end: Date): string {
    const timeFmt = new Intl.DateTimeFormat('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: VN_TIMEZONE,
    });
    const dateFmt = new Intl.DateTimeFormat('vi-VN', {
      weekday: 'long',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      timeZone: VN_TIMEZONE,
    });
    return `${timeFmt.format(start)} - ${timeFmt.format(end)}, ${dateFmt.format(start)}`;
  }

  /** Danh sách đơn ứng tuyển (từ "interviewed" trở đi) của mọi tin tuyển dụng thuộc recruiter — cho trang "Lịch phỏng vấn" */
  async listForRecruiter(
    recruiterId: string,
  ): Promise<RecruiterScheduleListItem[]> {
    const jobs = await this.jobRepo.find({ where: { recruiterId } });
    if (jobs.length === 0) {
      return [];
    }
    const jobById = new Map(jobs.map((job) => [job.id, job]));

    const applications = await this.appRepo.find({
      where: {
        jobId: In(jobs.map((job) => job.id)),
        status: In(INTERVIEW_RELATED_STATUSES),
      },
      relations: ['candidate'],
      order: { updatedAt: 'DESC' },
    });
    if (applications.length === 0) {
      return [];
    }

    const schedules = await this.scheduleRepo.find({
      where: { applicationId: In(applications.map((app) => app.id)) },
    });
    const scheduleByApplicationId = new Map(
      schedules.map((schedule) => [schedule.applicationId, schedule]),
    );

    return applications.map((application) => {
      const job = jobById.get(application.jobId)!;
      const schedule = scheduleByApplicationId.get(application.id);
      return {
        jobId: job.id,
        jobTitle: job.title,
        applicationId: application.id,
        applicationStatus: application.status,
        candidateId: application.candidateId,
        candidateName: application.candidate.fullName,
        candidateEmail: application.candidate.email,
        schedule: schedule
          ? {
              status: schedule.status,
              proposedSlots: schedule.proposedSlots,
              confirmedStartTime:
                schedule.confirmedStartTime?.toISOString() ?? null,
              confirmedEndTime:
                schedule.confirmedEndTime?.toISOString() ?? null,
              meetLink: schedule.meetLink,
            }
          : null,
      };
    });
  }

  async getScheduleForRecruiter(
    recruiterId: string,
    jobId: string,
    applicationId: string,
  ): Promise<Schedule | null> {
    await this.findOwnedJob(recruiterId, jobId);
    const application = await this.appRepo.findOne({
      where: { id: applicationId, jobId },
    });
    if (!application) {
      throw new NotFoundException('Không tìm thấy đơn ứng tuyển');
    }
    return this.scheduleRepo.findOne({ where: { applicationId } });
  }

  private assertValidSlots(slots: ProposedSlot[]): void {
    for (const slot of slots) {
      if (new Date(slot.end).getTime() <= new Date(slot.start).getTime()) {
        throw new BadRequestException(
          'Mỗi khung giờ đề xuất phải có thời gian kết thúc sau thời gian bắt đầu',
        );
      }
    }
  }

  private async transitionApplication(
    application: Application,
    toStatus: ApplicationStatus,
    changedBy: string,
    recruiterId: string,
  ): Promise<void> {
    const fromStatus = application.status;
    application.status = toStatus;
    await this.appRepo.save(application);
    await this.historyRepo.save(
      this.historyRepo.create({
        applicationId: application.id,
        fromStatus,
        toStatus,
        changedBy,
      }),
    );
    await this.dashboardCache.invalidate(recruiterId);
  }

  private async findOwnedJob(recruiterId: string, jobId: string): Promise<Job> {
    const job = await this.jobRepo.findOne({ where: { id: jobId } });
    if (!job) {
      throw new NotFoundException('Không tìm thấy tin tuyển dụng');
    }
    if (job.recruiterId !== recruiterId) {
      throw new ForbiddenException(
        'Bạn không có quyền quản lý đơn ứng tuyển của tin tuyển dụng này',
      );
    }
    return job;
  }
}
