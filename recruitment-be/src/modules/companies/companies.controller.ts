import 'multer';
import {
  Body,
  Controller,
  FileTypeValidator,
  ForbiddenException,
  Get,
  MaxFileSizeValidator,
  Param,
  ParseFilePipe,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Request,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CompaniesService } from './companies.service';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';

const MAX_LOGO_SIZE = 2 * 1024 * 1024;
const MAX_COVER_SIZE = 5 * 1024 * 1024;
const ALLOWED_IMAGE_MIME_TYPES = /^image\/(jpeg|png|webp)$/;

interface JwtUser {
  id: string;
  email: string;
  role: string;
}

@ApiTags('companies')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('companies')
export class CompaniesController {
  constructor(private readonly companiesService: CompaniesService) {}

  @ApiOperation({
    summary:
      'Lấy hồ sơ công ty của recruiter đang đăng nhập (null nếu chưa tạo)',
  })
  @Get('my')
  getMyCompany(@Request() req: { user: JwtUser }) {
    this.assertRecruiter(req.user);
    return this.companiesService.getMyCompany(req.user.id);
  }

  @ApiOperation({ summary: 'Tạo hoặc cập nhật toàn bộ hồ sơ công ty (upsert)' })
  @Put('my')
  upsert(@Request() req: { user: JwtUser }, @Body() dto: CreateCompanyDto) {
    this.assertRecruiter(req.user);
    return this.companiesService.upsert(req.user.id, dto);
  }

  @ApiOperation({ summary: 'Cập nhật một phần hồ sơ công ty' })
  @Patch('my')
  update(@Request() req: { user: JwtUser }, @Body() dto: UpdateCompanyDto) {
    this.assertRecruiter(req.user);
    return this.companiesService.update(req.user.id, dto);
  }

  @ApiOperation({
    summary: 'Tải lên logo công ty (JPEG/PNG/WEBP, tối đa 2 MB)',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @Post('my/logo')
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: MAX_LOGO_SIZE } }),
  )
  uploadLogo(
    @Request() req: { user: JwtUser },
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: MAX_LOGO_SIZE }),
          new FileTypeValidator({ fileType: ALLOWED_IMAGE_MIME_TYPES }),
        ],
      }),
    )
    file: Express.Multer.File,
  ) {
    this.assertRecruiter(req.user);
    return this.companiesService.uploadImage(req.user.id, 'logo', file);
  }

  @ApiOperation({
    summary: 'Tải lên ảnh bìa công ty (JPEG/PNG/WEBP, tối đa 5 MB)',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @Post('my/cover')
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: MAX_COVER_SIZE } }),
  )
  uploadCover(
    @Request() req: { user: JwtUser },
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: MAX_COVER_SIZE }),
          new FileTypeValidator({ fileType: ALLOWED_IMAGE_MIME_TYPES }),
        ],
      }),
    )
    file: Express.Multer.File,
  ) {
    this.assertRecruiter(req.user);
    return this.companiesService.uploadImage(req.user.id, 'cover', file);
  }

  @ApiOperation({
    summary: 'Danh sách công ty đã xuất bản (dành cho ứng viên)',
  })
  @Get()
  findPublished() {
    return this.companiesService.findPublished();
  }

  @ApiOperation({ summary: 'Lấy thông tin công ty theo ID' })
  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.companiesService.findById(id);
  }

  private assertRecruiter(user: JwtUser): void {
    if (user.role !== 'recruiter') {
      throw new ForbiddenException(
        'Chỉ Recruiter mới có thể quản lý hồ sơ công ty',
      );
    }
  }
}
