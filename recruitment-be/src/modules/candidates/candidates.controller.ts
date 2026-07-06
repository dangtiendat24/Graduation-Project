import { Controller, ForbiddenException, Get, Query, Request, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { CandidatesService } from './candidates.service'
import { GetCandidatesQueryDto } from './dto/get-candidates-query.dto'

interface JwtUser {
  id: string
  email: string
  role: string
}

@ApiTags('candidates')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('recruiter/candidates')
export class CandidatesController {
  constructor(private readonly candidatesService: CandidatesService) {}

  @ApiOperation({
    summary: 'Danh sách ứng viên đã nộp CV vào các tin tuyển dụng của recruiter đang đăng nhập',
  })
  @Get()
  findAll(@Request() req: { user: JwtUser }, @Query() query: GetCandidatesQueryDto) {
    this.assertRecruiter(req.user)
    return this.candidatesService.getCandidatesByRecruiter(req.user.id, query)
  }

  private assertRecruiter(user: JwtUser): void {
    if (user.role !== 'recruiter') {
      throw new ForbiddenException('Chỉ Recruiter mới có thể xem danh sách ứng viên')
    }
  }
}
