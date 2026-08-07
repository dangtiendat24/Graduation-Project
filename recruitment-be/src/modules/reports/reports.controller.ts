import {
  Controller,
  ForbiddenException,
  Get,
  Param,
  ParseUUIDPipe,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ReportsService } from './reports.service';

interface JwtUser {
  id: string;
  email: string;
  role: string;
}

@ApiTags('reports')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @ApiOperation({
    summary:
      'Xuất báo cáo PDF ứng viên (điểm phù hợp, radar chart kỹ năng, transcript phỏng vấn) — recruiter chủ sở hữu tin tuyển dụng',
  })
  @Get(':applicationId/pdf')
  getReportPdf(
    @Request() req: { user: JwtUser },
    @Param('applicationId', ParseUUIDPipe) applicationId: string,
  ) {
    this.assertRecruiter(req.user);
    return this.reportsService.getReportPdfUrl(req.user.id, applicationId);
  }

  /** Repo hiện chỉ có role 'recruiter' | 'candidate' — không có 'admin', nên chỉ check recruiter theo đúng pattern check tay dùng khắp nơi */
  private assertRecruiter(user: JwtUser): void {
    if (user.role !== 'recruiter') {
      throw new ForbiddenException(
        'Chỉ Recruiter mới có thể xuất báo cáo PDF ứng viên',
      );
    }
  }
}
