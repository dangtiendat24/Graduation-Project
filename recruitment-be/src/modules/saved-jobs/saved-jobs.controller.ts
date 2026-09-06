import {
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SavedJobsService } from './saved-jobs.service';

interface JwtUser {
  id: string;
  email: string;
  role: string;
}

@ApiTags('saved-jobs')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('candidate/saved-jobs')
export class SavedJobsController {
  constructor(private readonly savedJobsService: SavedJobsService) {}

  @ApiOperation({
    summary: 'Id các tin tuyển dụng candidate đang đăng nhập đã lưu',
  })
  @Get('ids')
  async findAllIds(@Request() req: { user: JwtUser }) {
    this.assertCandidate(req.user);
    return { jobIds: await this.savedJobsService.listSavedJobIds(req.user.id) };
  }

  @ApiOperation({
    summary:
      'Danh sách đầy đủ các tin tuyển dụng candidate đang đăng nhập đã lưu, mới lưu trước',
  })
  @Get()
  findAll(@Request() req: { user: JwtUser }) {
    this.assertCandidate(req.user);
    return this.savedJobsService.listSavedJobs(req.user.id);
  }

  @ApiOperation({ summary: 'Lưu 1 tin tuyển dụng' })
  @Post(':jobId')
  save(
    @Request() req: { user: JwtUser },
    @Param('jobId', ParseUUIDPipe) jobId: string,
  ) {
    this.assertCandidate(req.user);
    return this.savedJobsService.save(req.user.id, jobId);
  }

  @ApiOperation({ summary: 'Bỏ lưu 1 tin tuyển dụng' })
  @Delete(':jobId')
  unsave(
    @Request() req: { user: JwtUser },
    @Param('jobId', ParseUUIDPipe) jobId: string,
  ) {
    this.assertCandidate(req.user);
    return this.savedJobsService.unsave(req.user.id, jobId);
  }

  private assertCandidate(user: JwtUser): void {
    if (user.role !== 'candidate') {
      throw new ForbiddenException(
        'Chỉ Candidate mới có thể lưu tin tuyển dụng',
      );
    }
  }
}
