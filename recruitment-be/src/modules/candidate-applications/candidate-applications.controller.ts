import {
  Controller,
  ForbiddenException,
  Get,
  Param,
  ParseUUIDPipe,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CandidateApplicationsService } from './candidate-applications.service';
import { GetMyApplicationsQueryDto } from './dto/get-my-applications-query.dto';

interface JwtUser {
  id: string;
  email: string;
  role: string;
}

@ApiTags('candidate-applications')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('candidate/applications')
export class CandidateApplicationsController {
  constructor(
    private readonly candidateApplicationsService: CandidateApplicationsService,
  ) {}

  @ApiOperation({
    summary: 'Danh sách đơn ứng tuyển của candidate đang đăng nhập',
  })
  @Get()
  findAll(
    @Request() req: { user: JwtUser },
    @Query() query: GetMyApplicationsQueryDto,
  ) {
    this.assertCandidate(req.user);
    return this.candidateApplicationsService.getMyApplications(
      req.user.id,
      query,
    );
  }

  @ApiOperation({
    summary: 'Chi tiết 1 đơn ứng tuyển + lịch sử chuyển trạng thái',
  })
  @Get(':applicationId')
  findOne(
    @Request() req: { user: JwtUser },
    @Param('applicationId', ParseUUIDPipe) applicationId: string,
  ) {
    this.assertCandidate(req.user);
    return this.candidateApplicationsService.getApplicationDetail(
      req.user.id,
      applicationId,
    );
  }

  private assertCandidate(user: JwtUser): void {
    if (user.role !== 'candidate') {
      throw new ForbiddenException(
        'Chỉ Candidate mới có thể xem đơn ứng tuyển của mình',
      );
    }
  }
}
