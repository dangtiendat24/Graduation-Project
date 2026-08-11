import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  randomUUID,
} from 'node:crypto';
import { GoogleCalendarCredential } from './google-calendar-credential.entity';
import { AgentExecutionLoggerService } from '../admin/agent-execution-logger.service';

const GOOGLE_AUTHORIZE_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_CALENDAR_EVENTS_URL =
  'https://www.googleapis.com/calendar/v3/calendars/primary/events';
const CALENDAR_TIMEZONE = 'Asia/Ho_Chi_Minh';
const CALENDAR_SCOPES = [
  'https://www.googleapis.com/auth/calendar.readonly',
  'https://www.googleapis.com/auth/calendar.events',
];
const STATE_PURPOSE = 'google-calendar-connect';
// Refresh sớm hơn hạn thật 2 phút để tránh race condition khi gọi Calendar API ngay sau đó
const EXPIRY_SAFETY_MARGIN_MS = 2 * 60 * 1000;

interface GoogleTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  scope: string;
  token_type: string;
}

@Injectable()
export class GoogleCalendarService {
  private readonly logger = new Logger(GoogleCalendarService.name);

  constructor(
    @InjectRepository(GoogleCalendarCredential)
    private readonly credentialsRepo: Repository<GoogleCalendarCredential>,
    private readonly config: ConfigService,
    private readonly jwtService: JwtService,
    private readonly httpService: HttpService,
    private readonly agentLogger: AgentExecutionLoggerService,
  ) {}

  private get clientId(): string {
    return this.config.get<string>('GOOGLE_CLIENT_ID', '');
  }

  private get clientSecret(): string {
    return this.config.get<string>('GOOGLE_CLIENT_SECRET', '');
  }

  private get callbackUrl(): string {
    return this.config.get<string>(
      'GOOGLE_CALENDAR_CALLBACK_URL',
      'http://localhost:3000/api/auth/google/calendar/callback',
    );
  }

  private get encryptionKey(): Buffer {
    const key = this.config.get<string>('OAUTH_ENCRYPTION_KEY', '');
    if (key.length !== 32) {
      throw new Error(
        'OAUTH_ENCRYPTION_KEY phải đúng 32 ký tự (AES-256-GCM) — kiểm tra file .env',
      );
    }
    return Buffer.from(key, 'utf-8');
  }

  /** Mã hoá token trước khi lưu DB — định dạng "iv:authTag:ciphertext" (base64) */
  private encrypt(plainText: string): string {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.encryptionKey, iv);
    const ciphertext = Buffer.concat([
      cipher.update(plainText, 'utf-8'),
      cipher.final(),
    ]);
    const authTag = cipher.getAuthTag();
    return [
      iv.toString('base64'),
      authTag.toString('base64'),
      ciphertext.toString('base64'),
    ].join(':');
  }

  private decrypt(encoded: string): string {
    const [ivB64, authTagB64, ciphertextB64] = encoded.split(':');
    const decipher = createDecipheriv(
      'aes-256-gcm',
      this.encryptionKey,
      Buffer.from(ivB64, 'base64'),
    );
    decipher.setAuthTag(Buffer.from(authTagB64, 'base64'));
    return Buffer.concat([
      decipher.update(Buffer.from(ciphertextB64, 'base64')),
      decipher.final(),
    ]).toString('utf-8');
  }

  /** Sinh URL consent của Google kèm state ký JWT (10 phút) để callback xác định đúng recruiter */
  buildAuthUrl(userId: string): string {
    const state = this.jwtService.sign(
      { purpose: STATE_PURPOSE, sub: userId },
      { expiresIn: '10m' },
    );

    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.callbackUrl,
      response_type: 'code',
      scope: CALENDAR_SCOPES.join(' '),
      access_type: 'offline',
      prompt: 'consent',
      state,
    });
    return `${GOOGLE_AUTHORIZE_URL}?${params.toString()}`;
  }

  /** Giải mã + xác thực state token, trả về userId đã khởi tạo flow */
  verifyState(state: string): string {
    try {
      const payload = this.jwtService.verify<{
        purpose: string;
        sub: string;
      }>(state);
      if (payload.purpose !== STATE_PURPOSE) {
        throw new Error('wrong purpose');
      }
      return payload.sub;
    } catch {
      throw new BadRequestException(
        'state không hợp lệ hoặc đã hết hạn — vui lòng thử kết nối lại',
      );
    }
  }

  async handleCallback(code: string, state: string): Promise<void> {
    const userId = this.verifyState(state);
    const tokens = await this.exchangeCode(code);
    await this.saveTokens(userId, tokens);
  }

  private async exchangeCode(code: string): Promise<GoogleTokenResponse> {
    return this.requestToken({
      code,
      client_id: this.clientId,
      client_secret: this.clientSecret,
      redirect_uri: this.callbackUrl,
      grant_type: 'authorization_code',
    });
  }

  private async refreshAccessToken(
    refreshToken: string,
  ): Promise<GoogleTokenResponse> {
    return this.requestToken({
      refresh_token: refreshToken,
      client_id: this.clientId,
      client_secret: this.clientSecret,
      grant_type: 'refresh_token',
    });
  }

  private async requestToken(
    body: Record<string, string>,
  ): Promise<GoogleTokenResponse> {
    const res = await fetch(GOOGLE_TOKEN_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(body).toString(),
    });
    if (!res.ok) {
      const err = await res.text();
      this.logger.error(`Google token endpoint error: ${err}`);
      throw new BadRequestException(
        'Không thể xác thực với Google Calendar — vui lòng thử kết nối lại',
      );
    }
    return res.json() as Promise<GoogleTokenResponse>;
  }

  private async saveTokens(
    userId: string,
    tokens: GoogleTokenResponse,
  ): Promise<void> {
    const existing = await this.credentialsRepo.findOne({
      where: { userId },
    });
    const expiryDate = new Date(Date.now() + tokens.expires_in * 1000);

    // Google chỉ trả refresh_token ở lần consent đầu (hoặc khi prompt=consent) — giữ lại
    // refresh_token cũ nếu lần này không có, để tránh mất khả năng refresh về sau.
    const refreshToken = tokens.refresh_token
      ? this.encrypt(tokens.refresh_token)
      : existing?.refreshToken;
    if (!refreshToken) {
      throw new BadRequestException(
        'Google không trả về refresh_token — vui lòng thử kết nối lại',
      );
    }

    await this.credentialsRepo.upsert(
      {
        ...(existing ? { id: existing.id } : {}),
        userId,
        accessToken: this.encrypt(tokens.access_token),
        refreshToken,
        expiryDate,
        scope: tokens.scope,
      },
      ['userId'],
    );
  }

  /** Trả về access_token còn hạn cho user, tự refresh nếu sắp hết hạn */
  async getValidAccessToken(userId: string): Promise<string> {
    const credential = await this.credentialsRepo.findOne({
      where: { userId },
    });
    if (!credential) {
      throw new NotFoundException(
        'Chưa kết nối Google Calendar — vui lòng kết nối trước khi dùng tính năng gợi ý lịch',
      );
    }

    const isExpiringSoon =
      credential.expiryDate.getTime() - Date.now() < EXPIRY_SAFETY_MARGIN_MS;
    if (!isExpiringSoon) {
      return this.decrypt(credential.accessToken);
    }

    const tokens = await this.refreshAccessToken(
      this.decrypt(credential.refreshToken),
    );
    await this.saveTokens(userId, tokens);
    return tokens.access_token;
  }

  async getStatus(
    userId: string,
  ): Promise<{ connected: boolean; connectedAt: Date | null }> {
    const credential = await this.credentialsRepo.findOne({
      where: { userId },
    });
    return {
      connected: !!credential,
      connectedAt: credential?.createdAt ?? null,
    };
  }

  async disconnect(userId: string): Promise<void> {
    await this.credentialsRepo.delete({ userId });
  }

  /**
   * Agent 4 (ai-service) — đọc Google Calendar của recruiter qua access_token còn hạn,
   * trả về các slot trống trong giờ hành chính. access_token không rời khỏi service này.
   */
  async suggestSlots(
    userId: string,
    hrEmail: string,
    startDate: string,
    endDate: string,
    durationMinutes: number,
  ): Promise<TimeSlot[]> {
    const accessToken = await this.getValidAccessToken(userId);
    const aiServiceUrl = this.config.get<string>(
      'AI_SERVICE_URL',
      'http://localhost:8000',
    );

    // Agent 4 không chạy qua BullMQ processor — gọi ai-service đồng bộ ngay tại đây, nên
    // đây cũng là điểm bọc agentLogger.track duy nhất cho scheduling. Không gắn với 1
    // application cụ thể (suggest-slots là truy vấn lịch trống chung của recruiter).
    const data = await this.agentLogger.track(
      'agent4_scheduling',
      null,
      async () => {
        const { data } = await firstValueFrom(
          this.httpService.post<SuggestSlotsResponse>(
            `${aiServiceUrl}/api/ai/scheduling/suggest-slots`,
            {
              hr_email: hrEmail,
              date_range: { start_date: startDate, end_date: endDate },
              duration_minutes: durationMinutes,
              access_token: accessToken,
            },
          ),
        );

        if (!data.success) {
          throw new BadRequestException(
            data.error ?? 'ai-service trả về lỗi không xác định khi gợi ý lịch',
          );
        }
        return data;
      },
    );
    return data.slots;
  }

  /**
   * Tạo sự kiện trên Google Calendar (calendar "primary" của recruiter) kèm Google Meet —
   * gọi thẳng Google Calendar REST API bằng access_token còn hạn, không qua ai-service vì
   * đây là 1 lệnh ghi đơn giản, không cần orchestration của agent.
   */
  async createEvent(
    userId: string,
    params: {
      summary: string;
      description: string;
      startISO: string;
      endISO: string;
      attendeeEmails: string[];
    },
  ): Promise<{ eventId: string; meetLink: string | null }> {
    const accessToken = await this.getValidAccessToken(userId);

    const res = await fetch(
      `${GOOGLE_CALENDAR_EVENTS_URL}?conferenceDataVersion=1&sendUpdates=all`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          summary: params.summary,
          description: params.description,
          start: { dateTime: params.startISO, timeZone: CALENDAR_TIMEZONE },
          end: { dateTime: params.endISO, timeZone: CALENDAR_TIMEZONE },
          attendees: params.attendeeEmails.map((email) => ({ email })),
          conferenceData: {
            createRequest: {
              requestId: randomUUID(),
              conferenceSolutionKey: { type: 'hangoutsMeet' },
            },
          },
        }),
      },
    );

    if (!res.ok) {
      const err = await res.text();
      this.logger.error(`Google Calendar events.insert error: ${err}`);
      throw new BadRequestException(
        'Không thể tạo sự kiện trên Google Calendar — recruiter có thể chưa kết nối hoặc đã thu hồi quyền truy cập, vui lòng kết nối lại Google Calendar.',
      );
    }

    const event = (await res.json()) as {
      id: string;
      hangoutLink?: string;
    };
    return { eventId: event.id, meetLink: event.hangoutLink ?? null };
  }
}

export interface TimeSlot {
  start: string;
  end: string;
}

interface SuggestSlotsResponse {
  slots: TimeSlot[];
  success: boolean;
  error: string | null;
}
