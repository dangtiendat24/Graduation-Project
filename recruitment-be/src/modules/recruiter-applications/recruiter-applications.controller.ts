import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RecruiterApplicationsService } from './recruiter-applications.service';
import { GetJobApplicationsQueryDto } from './dto/get-job-applications-query.dto';
import { UpdateApplicationStatusDto } from './dto/update-application-status.dto';

interface JwtUser {
  id: string;
  email: string;
  role: string;
}

@ApiTags('recruiter-applications')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('jobs/:jobId/applications')
export class RecruiterApplicationsController {
  constructor(
    private readonly recruiterApplicationsService: RecruiterApplicationsService,
  ) {}

  @ApiOperation({
    summary:
      'Danh sách ứng viên đã nộp đơn vào 1 tin tuyển dụng, xếp hạng theo điểm phù hợp (recruiter chủ sở hữu)',
  })
  @Get()
  findAll(
    @Request() req: { user: JwtUser },
    @Param('jobId', ParseUUIDPipe) jobId: string,
    @Query() query: GetJobApplicationsQueryDto,
  ) {
    this.assertRecruiter(req.user);
    return this.recruiterApplicationsService.getJobApplications(
      req.user.id,
      jobId,
      query,
    );
  }

  @ApiOperation({
    summary:
      'Cập nhật trạng thái đơn ứng tuyển (recruiter chủ sở hữu). Chuyển sang "interviewed" hoặc "rejected" sẽ tự động gửi email cho ứng viên.',
  })
  @Patch(':applicationId/status')
  updateStatus(
    @Request() req: { user: JwtUser },
    @Param('jobId', ParseUUIDPipe) jobId: string,
    @Param('applicationId', ParseUUIDPipe) applicationId: string,
    @Body() dto: UpdateApplicationStatusDto,
  ) {
    this.assertRecruiter(req.user);
    return this.recruiterApplicationsService.updateStatus(
      req.user.id,
      jobId,
      applicationId,
      dto,
    );
  }

  private assertRecruiter(user: JwtUser): void {
    if (user.role !== 'recruiter') {
      throw new ForbiddenException(
        'Chỉ Recruiter mới có thể quản lý đơn ứng tuyển',
      );
    }
  }
}
