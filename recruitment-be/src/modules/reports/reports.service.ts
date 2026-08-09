import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import puppeteer from 'puppeteer';
import { Application } from '../applications/application.entity';
import { Job } from '../jobs/job.entity';
import { Company } from '../companies/company.entity';
import { MatchingResult } from '../applications/matching-result.entity';
import { InterviewSession } from '../applications/interview-session.entity';
import { InterviewAnswer } from '../applications/interview-answer.entity';
import { ApplicationStatusHistory } from '../applications/application-status-history.entity';
import { ReportCache } from './report-cache.entity';
import { StorageService } from '../storage/storage.service';
import { buildReportHtml } from './report-template';

const SIGNED_URL_EXPIRES_IN = 300;

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(Application)
    private readonly appRepo: Repository<Application>,
    @InjectRepository(Job)
    private readonly jobRepo: Repository<Job>,
    @InjectRepository(Company)
    private readonly companyRepo: Repository<Company>,
    @InjectRepository(MatchingResult)
    private readonly matchingResultRepo: Repository<MatchingResult>,
    @InjectRepository(InterviewSession)
    private readonly interviewSessionRepo: Repository<InterviewSession>,
    @InjectRepository(InterviewAnswer)
    private readonly interviewAnswerRepo: Repository<InterviewAnswer>,
    @InjectRepository(ApplicationStatusHistory)
    private readonly historyRepo: Repository<ApplicationStatusHistory>,
    @InjectRepository(ReportCache)
    private readonly reportCacheRepo: Repository<ReportCache>,
    private readonly storageService: StorageService,
  ) {}

  async getReportPdfUrl(
    recruiterId: string,
    applicationId: string,
  ): Promise<{ url: string }> {
    const application = await this.appRepo.findOne({
      where: { id: applicationId },
      relations: ['candidate'],
    });
    if (!application) {
      throw new NotFoundException('Không tìm thấy đơn ứng tuyển');
    }

    const job = await this.jobRepo.findOne({
      where: { id: application.jobId },
    });
    if (!job) {
      throw new NotFoundException('Không tìm thấy tin tuyển dụng');
    }
    if (job.recruiterId !== recruiterId) {
      throw new ForbiddenException(
        'Bạn không có quyền xuất báo cáo cho đơn ứng tuyển này',
      );
    }

    const matchingResult = await this.matchingResultRepo.findOne({
      where: { applicationId },
    });
    if (!matchingResult) {
      throw new NotFoundException(
        'Chưa có kết quả chấm điểm CV cho đơn ứng tuyển này',
      );
    }

    // Báo cáo còn nhúng dữ liệu InterviewSession (transcript/điểm phỏng vấn), nên
    // không thể chỉ khoá cache theo MatchingResult.updatedAt — nếu không, PDF export
    // trước khi ứng viên phỏng vấn xong sẽ mãi mãi bị stale, thiếu transcript dù đã có.
    const session = await this.interviewSessionRepo.findOne({
      where: { applicationId },
    });
    const sourceUpdatedAt =
      session && session.updatedAt > matchingResult.updatedAt
        ? session.updatedAt
        : matchingResult.updatedAt;

    const cached = await this.reportCacheRepo.findOne({
      where: { applicationId },
    });
    if (
      cached &&
      cached.sourceUpdatedAt.getTime() === sourceUpdatedAt.getTime()
    ) {
      const url = await this.storageService.getSignedUrl(
        cached.storageKey,
        SIGNED_URL_EXPIRES_IN,
      );
      return { url };
    }

    const storageKey = await this.renderAndUpload({
      application,
      job,
      matchingResult,
      session,
    });

    await this.reportCacheRepo.upsert(
      { applicationId, storageKey, sourceUpdatedAt },
      ['applicationId'],
    );

    const url = await this.storageService.getSignedUrl(
      storageKey,
      SIGNED_URL_EXPIRES_IN,
    );
    return { url };
  }

  /**
   * VD: "Backend Developer_Nguyen Van A.pdf" — đây là segment cuối của storage key (không phải
   * Content-Disposition: attachment — nếu dùng Supabase `download` option thì file sẽ bị ép tải
   * ngay thay vì mở xem trước trên tab mới). Supabase Storage validate key rất chặt, chỉ chấp nhận
   * ASCII an toàn (từ chối cả dấu ngoặc lẫn ký tự Unicode có dấu), nên phải bỏ dấu tiếng Việt rồi
   * mới lọc ký tự — nếu không "Đạt Đặng" bị strip trắng thay vì còn lại "Dat Dang".
   */
  private buildDownloadFilename(
    jobTitle: string,
    candidateName: string,
  ): string {
    const removeDiacritics = (s: string) =>
      s
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .replace(/đ/g, 'd')
        .replace(/Đ/g, 'D');
    const sanitize = (s: string) =>
      removeDiacritics(s)
        .replace(/[^A-Za-z0-9 _-]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
    return `${sanitize(jobTitle)}_${sanitize(candidateName)}.pdf`;
  }

  private async renderAndUpload(params: {
    application: Application;
    job: Job;
    matchingResult: MatchingResult;
    session: InterviewSession | null;
  }): Promise<string> {
    const { application, job, matchingResult, session } = params;

    const [company, history] = await Promise.all([
      job.companyId
        ? this.companyRepo.findOne({ where: { id: job.companyId } })
        : Promise.resolve(null),
      this.historyRepo.find({
        where: { applicationId: application.id },
        order: { changedAt: 'ASC' },
      }),
    ]);

    const answers = session
      ? await this.interviewAnswerRepo.find({
          where: { sessionId: session.id },
        })
      : [];

    const html = buildReportHtml({
      application,
      job,
      company,
      matchingResult,
      session,
      answers,
      history,
    });
    const pdfBuffer = await this.renderPdf(html);

    const filename = this.buildDownloadFilename(
      job.title,
      application.candidate.fullName,
    );
    const storageKey = `reports/${application.id}/${filename}`;
    await this.storageService.upload(storageKey, pdfBuffer, 'application/pdf');
    return storageKey;
  }

  private async renderPdf(html: string): Promise<Buffer> {
    const browser = await puppeteer.launch({
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    try {
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });
      const pdf = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: '20px', bottom: '20px', left: '20px', right: '20px' },
      });
      return Buffer.from(pdf);
    } finally {
      await browser.close();
    }
  }
}
