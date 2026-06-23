import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Put,
  Request,
  UseGuards,
} from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { CompaniesService } from './companies.service'
import { CreateCompanyDto } from './dto/create-company.dto'
import { UpdateCompanyDto } from './dto/update-company.dto'

interface JwtUser {
  id: string
  email: string
  role: string
}

@ApiTags('companies')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('companies')
export class CompaniesController {
  constructor(private readonly companiesService: CompaniesService) {}

  @ApiOperation({ summary: 'Lấy hồ sơ công ty của recruiter đang đăng nhập (null nếu chưa tạo)' })
  @Get('my')
  getMyCompany(@Request() req: { user: JwtUser }) {
    this.assertRecruiter(req.user)
    return this.companiesService.getMyCompany(req.user.id)
  }

  @ApiOperation({ summary: 'Tạo hoặc cập nhật toàn bộ hồ sơ công ty (upsert)' })
  @Put('my')
  upsert(@Request() req: { user: JwtUser }, @Body() dto: CreateCompanyDto) {
    this.assertRecruiter(req.user)
    return this.companiesService.upsert(req.user.id, dto)
  }

  @ApiOperation({ summary: 'Cập nhật một phần hồ sơ công ty' })
  @Patch('my')
  update(@Request() req: { user: JwtUser }, @Body() dto: UpdateCompanyDto) {
    this.assertRecruiter(req.user)
    return this.companiesService.update(req.user.id, dto)
  }

  @ApiOperation({ summary: 'Danh sách công ty đã xuất bản (dành cho ứng viên)' })
  @Get()
  findPublished() {
    return this.companiesService.findPublished()
  }

  @ApiOperation({ summary: 'Lấy thông tin công ty theo ID' })
  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.companiesService.findById(id)
  }

  private assertRecruiter(user: JwtUser): void {
    if (user.role !== 'recruiter') {
      throw new ForbiddenException('Chỉ Recruiter mới có thể quản lý hồ sơ công ty')
    }
  }
}
