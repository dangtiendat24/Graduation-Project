import {
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Query,
  Request,
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiExcludeEndpoint,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GoogleCalendarService } from './google-calendar.service';
import { SuggestSlotsQueryDto } from './dto/suggest-slots-query.dto';

interface JwtUser {
  id: string;
  email: string;
  role: string;
}

@ApiTags('google-calendar')
@Controller()
export class GoogleCalendarController {
  constructor(
    private readonly googleCalendarService: GoogleCalendarService,
    private readonly config: ConfigService,
  ) {}

  @ApiOperation({
    summary:
      'Lấy URL consent Google để recruiter kết nối Google Calendar (agent4 scheduling)',
  })
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  @Get('auth/google/calendar')
  connect(
    @Request() req: { user: JwtUser },
    @Query('returnTo') returnTo?: string,
  ) {
    this.assertRecruiter(req.user);
    return {
      url: this.googleCalendarService.buildAuthUrl(req.user.id, returnTo),
    };
  }

  @ApiExcludeEndpoint()
  @Get('auth/google/calendar/callback')
  async callback(
    @Query('code') code: string | undefined,
    @Query('state') state: string | undefined,
    @Query('error') error: string | undefined,
    @Res() res: Response,
  ) {
    const frontendUrl = this.config.get<string>(
      'FRONTEND_URL',
      'http://localhost:5173',
    );
    const redirect = (path: string, params: Record<string, string>) =>
      res.redirect(
        `${frontendUrl}${path}?${new URLSearchParams(params).toString()}`,
      );

    if (error || !code || !state) {
      return redirect('/recruiter/settings', {
        googleCalendar: 'error',
        reason: error ?? 'missing_code_or_state',
      });
    }

    // Xác thực state trước để biết returnTo — kể cả khi bước exchange code bên dưới lỗi,
    // vẫn đưa được recruiter về đúng trang đã bấm "Kết nối Google Calendar".
    let userId: string;
    let returnTo: string;
    try {
      ({ userId, returnTo } = this.googleCalendarService.verifyState(state));
    } catch (err) {
      return redirect('/recruiter/settings', {
        googleCalendar: 'error',
        reason: err instanceof Error ? err.message : 'invalid_state',
      });
    }

    try {
      await this.googleCalendarService.handleCallback(code, userId);
      return redirect(returnTo, { googleCalendar: 'connected' });
    } catch (err) {
      return redirect(returnTo, {
        googleCalendar: 'error',
        reason: err instanceof Error ? err.message : 'unknown_error',
      });
    }
  }

  @ApiOperation({
    summary: 'Kiểm tra recruiter đã kết nối Google Calendar chưa',
  })
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  @Get('google-calendar/status')
  status(@Request() req: { user: JwtUser }) {
    this.assertRecruiter(req.user);
    return this.googleCalendarService.getStatus(req.user.id);
  }

  @ApiOperation({
    summary:
      'Kiểm tra lịch trống của recruiter hiện tại trên Google Calendar (Agent 4) — trả về tối đa 5 slot gần nhất trong giờ hành chính',
  })
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  @Get('google-calendar/suggest-slots')
  suggestSlots(
    @Request() req: { user: JwtUser },
    @Query() query: SuggestSlotsQueryDto,
  ) {
    this.assertRecruiter(req.user);
    return this.googleCalendarService.suggestSlots(
      req.user.id,
      req.user.email,
      query.startDate,
      query.endDate,
      query.durationMinutes ?? 45,
    );
  }

  @ApiOperation({
    summary: 'Ngắt kết nối Google Calendar của recruiter hiện tại',
  })
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  @Delete('google-calendar')
  disconnect(@Request() req: { user: JwtUser }) {
    this.assertRecruiter(req.user);
    return this.googleCalendarService.disconnect(req.user.id);
  }

  private assertRecruiter(user: JwtUser): void {
    if (user.role !== 'recruiter') {
      throw new ForbiddenException(
        'Chỉ Recruiter mới có thể kết nối Google Calendar',
      );
    }
  }
}
