import 'multer';
import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import * as path from 'path';
import { User } from '../users/user.entity';
import { StorageService } from '../storage/storage.service';
import { UpdateAccountDto } from './dto/update-account.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UpdateNotificationPreferencesDto } from './dto/update-notification-preferences.dto';
import { UpdateScoringWeightsDto } from './dto/update-scoring-weights.dto';
import { DEFAULT_NOTIFICATION_PREFERENCES } from './notification-preferences';

/** Ký 10 năm — về mặt thực tế coi như vĩnh viễn, tránh phải tự refresh URL avatar liên tục */
const AVATAR_SIGNED_URL_EXPIRES_IN = 60 * 60 * 24 * 365 * 10;

@Injectable()
export class SettingsService {
  private readonly logger = new Logger(SettingsService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly storage: StorageService,
  ) {}

  async getSettings(userId: string) {
    const user = await this.findUserOrThrow(userId);
    return this.toSettingsResponse(user);
  }

  async updateAccount(userId: string, dto: UpdateAccountDto) {
    const user = await this.findUserOrThrow(userId);
    Object.assign(user, dto);
    const saved = await this.userRepo.save(user);
    return this.toSettingsResponse(saved);
  }

  async changePassword(userId: string, dto: ChangePasswordDto): Promise<void> {
    const user = await this.findUserOrThrow(userId);
    if (!user.passwordHash) {
      throw new BadRequestException(
        'Tài khoản đăng nhập bằng Google, không thể đổi mật khẩu',
      );
    }
    const matches = await bcrypt.compare(
      dto.currentPassword,
      user.passwordHash,
    );
    if (!matches) {
      throw new BadRequestException('Mật khẩu hiện tại không đúng');
    }
    user.passwordHash = await bcrypt.hash(dto.newPassword, 10);
    await this.userRepo.save(user);
  }

  async uploadAvatar(userId: string, file: Express.Multer.File) {
    const user = await this.findUserOrThrow(userId);

    if (user.avatarStorageKey) {
      await this.deleteAvatarFileQuietly(user.avatarStorageKey);
    }

    const ext = path.extname(file.originalname);
    const key = `avatars/${userId}/${Date.now()}${ext}`;
    await this.storage.upload(key, file.buffer, file.mimetype);
    const url = await this.storage.getSignedUrl(
      key,
      AVATAR_SIGNED_URL_EXPIRES_IN,
    );

    user.avatarStorageKey = key;
    user.avatarUrl = url;
    const saved = await this.userRepo.save(user);
    return this.toSettingsResponse(saved);
  }

  async removeAvatar(userId: string) {
    const user = await this.findUserOrThrow(userId);
    if (user.avatarStorageKey) {
      await this.deleteAvatarFileQuietly(user.avatarStorageKey);
    }
    user.avatarStorageKey = null;
    user.avatarUrl = null;
    const saved = await this.userRepo.save(user);
    return this.toSettingsResponse(saved);
  }

  /** Không để lỗi xoá file cũ (vd đã bị xoá thủ công) chặn luồng thay/xoá avatar chính */
  private async deleteAvatarFileQuietly(key: string): Promise<void> {
    try {
      await this.storage.delete(key);
    } catch (err) {
      this.logger.warn(
        `Xoá avatar cũ thất bại (bỏ qua): ${(err as Error).message}`,
      );
    }
  }

  async updateNotificationPreferences(
    userId: string,
    dto: UpdateNotificationPreferencesDto,
  ) {
    const user = await this.findUserOrThrow(userId);
    user.notificationPreferences = { ...dto };
    const saved = await this.userRepo.save(user);
    return this.toSettingsResponse(saved);
  }

  async updateScoringWeights(userId: string, dto: UpdateScoringWeightsDto) {
    this.assertValidScoringWeights(dto.weights);
    const user = await this.findUserOrThrow(userId);
    user.defaultScoringWeights = dto.weights ?? null;
    const saved = await this.userRepo.save(user);
    return this.toSettingsResponse(saved);
  }

  /** Trọng số phải cộng lại đúng 1 (dung sai làm tròn 0.001) — giống validation ở JobsService */
  private assertValidScoringWeights(
    weights?: { skills: number; experience: number; education: number } | null,
  ): void {
    if (!weights) return;
    const sum = weights.skills + weights.experience + weights.education;
    if (Math.abs(sum - 1) > 0.001) {
      throw new BadRequestException(
        `Tổng trọng số phải bằng 1 (hiện tại: ${sum.toFixed(3)})`,
      );
    }
  }

  private async findUserOrThrow(userId: string): Promise<User> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('Không tìm thấy người dùng');
    return user;
  }

  private toSettingsResponse(user: User) {
    return {
      fullName: user.fullName,
      email: user.email,
      phone: user.phone,
      avatarUrl: user.avatarUrl,
      role: user.role,
      hasPassword: !!user.passwordHash,
      notificationPreferences:
        user.notificationPreferences ?? DEFAULT_NOTIFICATION_PREFERENCES,
      defaultScoringWeights: user.defaultScoringWeights,
    };
  }
}
