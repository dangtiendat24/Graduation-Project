import {
  Controller,
  ForbiddenException,
  Get,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ScheduleService } from './schedule.service';

interface JwtUser {
  id: string;
  email: string;
  role: string;
}

@ApiTags('recruiter-schedule')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('recruiter/schedules')
export class RecruiterScheduleController {
  constructor(private readonly scheduleService: ScheduleService) {}

  @ApiOperation({
    summary:
      'Danh sách đơn ứng tuyển từ "interviewed" trở đi của mọi tin tuyển dụng thuộc recruiter — cho trang Lịch phỏng vấn',
  })
  @Get()
  list(@Request() req: { user: JwtUser }) {
    if (req.user.role !== 'recruiter') {
      throw new ForbiddenException(
        'Chỉ Recruiter mới có thể xem danh sách lịch phỏng vấn',
      );
    }
    return this.scheduleService.listForRecruiter(req.user.id);
  }
}
