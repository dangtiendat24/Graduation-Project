import {
  Controller,
  ForbiddenException,
  Get,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { DashboardService, DashboardStatsResponse } from './dashboard.service';

interface JwtUser {
  id: string;
  email: string;
  role: string;
}

@ApiTags('dashboard')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @ApiOperation({
    summary:
      'Thống kê tổng quan cho HR: funnel, thời gian phỏng vấn, phân bổ điểm, top kỹ năng',
  })
  @Get('stats')
  getStats(@Request() req: { user: JwtUser }): Promise<DashboardStatsResponse> {
    this.assertRecruiter(req.user);
    return this.dashboardService.getStats(req.user.id);
  }

  private assertRecruiter(user: JwtUser): void {
    if (user.role !== 'recruiter') {
      throw new ForbiddenException('Chỉ Recruiter mới có thể xem thống kê');
    }
  }
}
