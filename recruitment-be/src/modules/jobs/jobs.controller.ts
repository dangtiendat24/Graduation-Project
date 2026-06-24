import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { JobsService } from './jobs.service'
import { CreateJobDto } from './dto/create-job.dto'
import { UpdateJobDto } from './dto/update-job.dto'

interface JwtUser {
  id: string
  email: string
  role: string
}

@ApiTags('jobs')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('jobs')
export class JobsController {
  constructor(private readonly jobsService: JobsService) {}

  @ApiOperation({ summary: 'Tạo tin tuyển dụng mới (recruiter)' })
  @Post()
  create(@Request() req: { user: JwtUser }, @Body() dto: CreateJobDto) {
    this.assertRecruiter(req.user)
    return this.jobsService.create(req.user.id, dto)
  }

  @ApiOperation({ summary: 'Danh sách tin tuyển dụng của recruiter đang đăng nhập' })
  @Get('my')
  findMy(@Request() req: { user: JwtUser }) {
    this.assertRecruiter(req.user)
    return this.jobsService.findByRecruiter(req.user.id)
  }

  @ApiOperation({ summary: 'Danh sách tin đang tuyển dụng (public cho ứng viên)' })
  @Get()
  findActive() {
    return this.jobsService.findActive()
  }

  @ApiOperation({ summary: 'Chi tiết tin tuyển dụng' })
  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.jobsService.findOne(id)
  }

  @ApiOperation({ summary: 'Cập nhật tin tuyển dụng (recruiter chủ sở hữu)' })
  @Patch(':id')
  update(
    @Request() req: { user: JwtUser },
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateJobDto,
  ) {
    this.assertRecruiter(req.user)
    return this.jobsService.update(req.user.id, id, dto)
  }

  @ApiOperation({ summary: 'Đóng tin tuyển dụng (status → closed)' })
  @Patch(':id/close')
  close(@Request() req: { user: JwtUser }, @Param('id', ParseUUIDPipe) id: string) {
    this.assertRecruiter(req.user)
    return this.jobsService.close(req.user.id, id)
  }

  @ApiOperation({ summary: 'Xóa tin tuyển dụng (recruiter chủ sở hữu)' })
  @Delete(':id')
  @HttpCode(204)
  remove(@Request() req: { user: JwtUser }, @Param('id', ParseUUIDPipe) id: string) {
    this.assertRecruiter(req.user)
    return this.jobsService.remove(req.user.id, id)
  }

  private assertRecruiter(user: JwtUser): void {
    if (user.role !== 'recruiter') {
      throw new ForbiddenException('Chỉ Recruiter mới có thể quản lý tin tuyển dụng')
    }
  }
}
