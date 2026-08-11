import 'multer';
import {
  Body,
  Controller,
  Delete,
  FileTypeValidator,
  ForbiddenException,
  Get,
  MaxFileSizeValidator,
  ParseFilePipe,
  Patch,
  Post,
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
import { SettingsService } from './settings.service';
import { UpdateAccountDto } from './dto/update-account.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UpdateNotificationPreferencesDto } from './dto/update-notification-preferences.dto';
import { UpdateScoringWeightsDto } from './dto/update-scoring-weights.dto';

const MAX_AVATAR_SIZE = 2 * 1024 * 1024;
const ALLOWED_AVATAR_MIME_TYPES = /^image\/(jpeg|png|webp)$/;

interface JwtUser {
  id: string;
  email: string;
  role: string;
}

@ApiTags('settings')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @ApiOperation({
    summary: 'Lấy cài đặt tài khoản, thông báo, trọng số chấm điểm mặc định',
  })
  @Get()
  getSettings(@Request() req: { user: JwtUser }) {
    return this.settingsService.getSettings(req.user.id);
  }

  @ApiOperation({ summary: 'Cập nhật thông tin tài khoản (họ tên, SĐT)' })
  @Patch('account')
  updateAccount(
    @Request() req: { user: JwtUser },
    @Body() dto: UpdateAccountDto,
  ) {
    return this.settingsService.updateAccount(req.user.id, dto);
  }

  @ApiOperation({
    summary: 'Tải lên ảnh đại diện (JPEG/PNG/WEBP, tối đa 2 MB)',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @Post('account/avatar')
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: MAX_AVATAR_SIZE } }),
  )
  uploadAvatar(
    @Request() req: { user: JwtUser },
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: MAX_AVATAR_SIZE }),
          new FileTypeValidator({ fileType: ALLOWED_AVATAR_MIME_TYPES }),
        ],
      }),
    )
    file: Express.Multer.File,
  ) {
    return this.settingsService.uploadAvatar(req.user.id, file);
  }

  @ApiOperation({ summary: 'Xoá ảnh đại diện' })
  @Delete('account/avatar')
  removeAvatar(@Request() req: { user: JwtUser }) {
    return this.settingsService.removeAvatar(req.user.id);
  }

  @ApiOperation({ summary: 'Đổi mật khẩu' })
  @Post('change-password')
  changePassword(
    @Request() req: { user: JwtUser },
    @Body() dto: ChangePasswordDto,
  ) {
    return this.settingsService.changePassword(req.user.id, dto);
  }

  @ApiOperation({ summary: 'Cập nhật tuỳ chọn nhận email thông báo' })
  @Patch('notifications')
  updateNotificationPreferences(
    @Request() req: { user: JwtUser },
    @Body() dto: UpdateNotificationPreferencesDto,
  ) {
    return this.settingsService.updateNotificationPreferences(req.user.id, dto);
  }

  @ApiOperation({
    summary:
      'Cập nhật trọng số chấm điểm CV mặc định — chỉ Recruiter, áp dụng cho job mới không tự set riêng',
  })
  @Patch('scoring-weights')
  updateScoringWeights(
    @Request() req: { user: JwtUser },
    @Body() dto: UpdateScoringWeightsDto,
  ) {
    this.assertRecruiter(req.user);
    return this.settingsService.updateScoringWeights(req.user.id, dto);
  }

  private assertRecruiter(user: JwtUser): void {
    if (user.role !== 'recruiter') {
      throw new ForbiddenException(
        'Chỉ Recruiter mới có thể cấu hình trọng số chấm điểm mặc định',
      );
    }
  }
}
