import {
  Controller,
  ForbiddenException,
  Get,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RecruiterReportsService } from './recruiter-reports.service';
import { GetReportsOverviewQueryDto } from './dto/get-reports-overview-query.dto';

interface JwtUser {
  id: string;
  email: string;
  role: string;
}

@ApiTags('recruiter-reports')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('recruiter/reports')
export class RecruiterReportsController {
  constructor(private readonly recruiterReportsService: RecruiterReportsService) {}

  @ApiOperation({
    summary:
      'Tổng quan báo cáo tuyển dụng: số ứng viên sàng lọc, tỷ lệ đi tiếp từng vòng, thời gian xử lý trung bình (recruiter đang đăng nhập)',
  })
  @Get('overview')
  getOverview(
    @Request() req: { user: JwtUser },
    @Query() query: GetReportsOverviewQueryDto,
  ) {
    this.assertRecruiter(req.user);
    return this.recruiterReportsService.getOverview(req.user.id, query);
  }

  private assertRecruiter(user: JwtUser): void {
    if (user.role !== 'recruiter') {
      throw new ForbiddenException('Chỉ Recruiter mới có thể xem báo cáo tuyển dụng');
    }
  }
}
