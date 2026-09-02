import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { User } from './user.entity'

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,
  ) { }

  findByEmail(email: string) {
    return this.usersRepo.findOne({ where: { email } })
  }

  findById(id: string) {
    return this.usersRepo.findOne({ where: { id } })
  }

  create(data: Partial<User>) {
    return this.usersRepo.save(this.usersRepo.create(data))
  }

  async setVerifyToken(userId: string, token: string, expires: Date) {
    await this.usersRepo.update(userId, {
      emailVerifyToken: token,
      emailVerifyExpires: expires,
    })
  }

  async activateByToken(token: string): Promise<User | null> {
    const user = await this.usersRepo.findOne({ where: { emailVerifyToken: token } })
    if (!user || !user.emailVerifyExpires) return null
    if (user.emailVerifyExpires < new Date()) return null

    await this.usersRepo.update(user.id, {
      isActive: true,
      emailVerifyToken: null,
      emailVerifyExpires: null,
    })
    return user
  }

  findByGoogleId(googleId: string) {
    return this.usersRepo.findOne({ where: { googleId } })
  }

  async setPasswordResetToken(userId: string, token: string, expires: Date) {
    await this.usersRepo.update(userId, {
      passwordResetToken: token,
      passwordResetExpires: expires,
    })
  }

  findByPasswordResetToken(token: string) {
    return this.usersRepo.findOne({ where: { passwordResetToken: token } })
  }

  async resetPassword(userId: string, passwordHash: string) {
    await this.usersRepo.update(userId, {
      passwordHash,
      passwordResetToken: null,
      passwordResetExpires: null,
    })
  }

  async linkGoogleId(userId: string, googleId: string, avatarUrl?: string) {
    const update: Partial<User> = { googleId, isActive: true }
    if (avatarUrl) update.avatarUrl = avatarUrl
    await this.usersRepo.update(userId, update)
  }

  /**
   * Đăng ký lại đè lên tài khoản chưa xác nhận email (chưa từng đăng nhập được nên không có dữ
   * liệu nghiệp vụ nào gắn theo id) — cho phép đổi role/mật khẩu/họ tên thay vì tạo user mới,
   * tránh vi phạm unique constraint trên email.
   */
  async reregisterUnverified(
    userId: string,
    data: { passwordHash: string; fullName: string; role: 'recruiter' | 'candidate' },
  ) {
    await this.usersRepo.update(userId, data)
  }
}
