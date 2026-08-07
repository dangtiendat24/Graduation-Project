import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RecruiterApplicationsService } from './recruiter-applications.service';
import { ScheduleService } from '../applications/schedule.service';
import { GetJobApplicationsQueryDto } from './dto/get-job-applications-query.dto';
import { UpdateApplicationStatusDto } from './dto/update-application-status.dto';
import { ProposeSlotsDto } from '../applications/dto/propose-slots.dto';

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
    private readonly scheduleService: ScheduleService,
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
      'Cập nhật trạng thái đơn ứng tuyển (recruiter chủ sở hữu). Chuyển sang "interviewed", "rejected" hoặc "hired" sẽ tự động gửi email cho ứng viên.',
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

  @ApiOperation({
    summary:
      'Kết quả buổi phỏng vấn AI của 1 ứng viên (điểm từng câu, nhận xét, transcript) — recruiter chủ sở hữu tin tuyển dụng',
  })
  @Get(':applicationId/interview')
  getInterviewResult(
    @Request() req: { user: JwtUser },
    @Param('jobId', ParseUUIDPipe) jobId: string,
    @Param('applicationId', ParseUUIDPipe) applicationId: string,
  ) {
    this.assertRecruiter(req.user);
    return this.recruiterApplicationsService.getInterviewResult(
      req.user.id,
      jobId,
      applicationId,
    );
  }

  @ApiOperation({
    summary:
      'Gửi 1-5 khung giờ đề xuất phỏng vấn cho ứng viên (recruiter chủ sở hữu) — đơn phải đang ở trạng thái "interviewed"',
  })
  @Post(':applicationId/schedule')
  proposeSlots(
    @Request() req: { user: JwtUser },
    @Param('jobId', ParseUUIDPipe) jobId: string,
    @Param('applicationId', ParseUUIDPipe) applicationId: string,
    @Body() dto: ProposeSlotsDto,
  ) {
    this.assertRecruiter(req.user);
    return this.scheduleService.proposeSlots(
      req.user.id,
      jobId,
      applicationId,
      dto.slots,
    );
  }

  @ApiOperation({
    summary:
      'Xem lịch phỏng vấn (khung giờ đề xuất/đã xác nhận) của 1 đơn ứng tuyển',
  })
  @Get(':applicationId/schedule')
  getSchedule(
    @Request() req: { user: JwtUser },
    @Param('jobId', ParseUUIDPipe) jobId: string,
    @Param('applicationId', ParseUUIDPipe) applicationId: string,
  ) {
    this.assertRecruiter(req.user);
    return this.scheduleService.getScheduleForRecruiter(
      req.user.id,
      jobId,
      applicationId,
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
