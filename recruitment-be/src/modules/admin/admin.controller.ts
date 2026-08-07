import {
  Controller,
  ForbiddenException,
  Get,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  AdminAgentStatsService,
  AgentStatsItem,
} from './admin-agent-stats.service';

interface JwtUser {
  id: string;
  email: string;
  role: string;
}

/**
 * Repo hiện chỉ có role 'recruiter' | 'candidate' — chưa có 'admin' — nên "quyền admin" ở đây
 * được ánh xạ sang role 'recruiter', theo đúng mô hình phân quyền hiện có (đồng nhất với
 * assertRecruiter ở dashboard/reports/google-calendar).
 */
@ApiTags('admin')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('admin')
export class AdminController {
  constructor(private readonly agentStatsService: AdminAgentStatsService) {}

  @ApiOperation({
    summary:
      'Thống kê hiệu suất thực thi các Agent: avg duration, success rate, log lỗi gần nhất',
  })
  @Get('agent-stats')
  getAgentStats(@Request() req: { user: JwtUser }): Promise<AgentStatsItem[]> {
    this.assertRecruiter(req.user);
    return this.agentStatsService.getStats();
  }

  private assertRecruiter(user: JwtUser): void {
    if (user.role !== 'recruiter') {
      throw new ForbiddenException(
        'Chỉ Recruiter mới có thể xem thống kê Agent',
      );
    }
  }
}
