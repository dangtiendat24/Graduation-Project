import 'multer'
import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  MaxFileSizeValidator,
  Patch,
  Post,
  ParseFilePipe,
  Request,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { ProfileService } from './profile.service'
import { UpdateProfileDto } from './dto/update-profile.dto'

interface JwtUser {
  id: string
  email: string
  role: string
}

@ApiTags('profile')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('profile')
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  @ApiOperation({ summary: 'Lấy hồ sơ cá nhân của candidate đang đăng nhập' })
  @Get('me')
  getMyProfile(@Request() req: { user: JwtUser }) {
    this.assertCandidate(req.user)
    return this.profileService.getMyProfile(req.user.id)
  }

  @ApiOperation({ summary: 'Cập nhật thông tin cá nhân (fullName, phone, city, linkedin, github)' })
  @Patch('me')
  updateProfile(
    @Request() req: { user: JwtUser },
    @Body() dto: UpdateProfileDto,
  ) {
    this.assertCandidate(req.user)
    return this.profileService.updateProfile(req.user.id, dto)
  }

  @ApiOperation({ summary: 'Tải lên CV (PDF hoặc DOCX, tối đa 5 MB)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @Post('me/cv')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 5 * 1024 * 1024 } }))
  uploadCV(
    @Request() req: { user: JwtUser },
    @UploadedFile(
      new ParseFilePipe({
        validators: [new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 })],
      }),
    )
    file: Express.Multer.File,
  ) {
    this.assertCandidate(req.user)
    return this.profileService.uploadCV(req.user.id, file)
  }

  private assertCandidate(user: JwtUser): void {
    if (user.role !== 'candidate') {
      throw new ForbiddenException('Chỉ Candidate mới có thể quản lý hồ sơ cá nhân')
    }
  }
}
