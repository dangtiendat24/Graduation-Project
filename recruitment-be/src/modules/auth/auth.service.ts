import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import * as bcrypt from 'bcrypt'
import * as crypto from 'crypto'
import { UsersService } from '../users/users.service'
import { MailService } from '../mail/mail.service'
import { RegisterDto } from './dto/register.dto'
import { LoginDto } from './dto/login.dto'
import { ForgotPasswordDto } from './dto/forgot-password.dto'
import { ResetPasswordDto } from './dto/reset-password.dto'

interface GoogleProfile {
  email: string | undefined
  googleId: string
  fullName: string
  avatarUrl: string | null
}

type GoogleAuthResult =
  | { ok: true; accessToken: string; user: { id: string; email: string; fullName: string; role: string; avatarUrl: string | null } }
  | { ok: false; reason: string }

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly mailService: MailService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.usersService.findByEmail(dto.email)
    if (existing) throw new ConflictException('Email đã được sử dụng')

    const passwordHash = await bcrypt.hash(dto.password, 10)
    const user = await this.usersService.create({
      email: dto.email,
      passwordHash,
      fullName: dto.fullName,
      role: dto.role,
    })

    const token = crypto.randomBytes(32).toString('hex')
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24h
    await this.usersService.setVerifyToken(user.id, token, expires)

    await this.mailService.sendVerificationEmail(dto.email, dto.fullName, token)

    return {
      message: 'Đăng ký thành công! Vui lòng kiểm tra email để xác nhận tài khoản.',
    }
  }

  async verifyEmail(token: string) {
    const user = await this.usersService.activateByToken(token)
    if (!user) throw new BadRequestException('Token xác nhận không hợp lệ hoặc đã hết hạn')
    return { message: 'Xác nhận email thành công! Bạn có thể đăng nhập ngay bây giờ.' }
  }

  async login(dto: LoginDto) {
    const user = await this.usersService.findByEmail(dto.email)
    if (!user || !user.passwordHash)
      throw new UnauthorizedException('Email hoặc mật khẩu không đúng')

    const valid = await bcrypt.compare(dto.password, user.passwordHash)
    if (!valid)
      throw new UnauthorizedException('Email hoặc mật khẩu không đúng')

    if (!user.isActive)
      throw new UnauthorizedException(
        'Tài khoản chưa được xác nhận. Vui lòng kiểm tra email của bạn.',
      )

    const payload = { sub: user.id, email: user.email, role: user.role }
    const accessToken = this.jwtService.sign(payload)

    return {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        avatarUrl: user.avatarUrl,
      },
    }
  }

  /**
   * Không tiết lộ tài khoản có tồn tại hay không khi email không đăng ký — trả về message
   * chung chung để tránh dò email. Nhưng NẾU email tồn tại và là tài khoản Google (không có
   * passwordHash) thì báo rõ cho người dùng biết để họ đăng nhập bằng Google thay vì bối rối
   * không hiểu sao không nhận được email.
   */
  async forgotPassword(dto: ForgotPasswordDto) {
    const GENERIC_MESSAGE =
      'Nếu email này đã đăng ký, chúng tôi đã gửi link đặt lại mật khẩu. Vui lòng kiểm tra hộp thư.'

    const user = await this.usersService.findByEmail(dto.email)
    if (!user) return { message: GENERIC_MESSAGE }

    if (!user.passwordHash) {
      return {
        message:
          'Tài khoản này đăng nhập bằng Google. Vui lòng đăng nhập bằng Google thay vì đặt lại mật khẩu.',
      }
    }

    const token = crypto.randomBytes(32).toString('hex')
    const expires = new Date(Date.now() + 60 * 60 * 1000) // 1h — ngắn hơn token xác nhận email vì đây là thao tác nhạy cảm hơn
    await this.usersService.setPasswordResetToken(user.id, token, expires)

    await this.mailService.sendPasswordResetEmail(user.email, user.fullName, token)

    return { message: GENERIC_MESSAGE }
  }

  async resetPassword(dto: ResetPasswordDto) {
    const user = await this.usersService.findByPasswordResetToken(dto.token)
    if (!user || !user.passwordResetExpires || user.passwordResetExpires < new Date()) {
      throw new BadRequestException(
        'Link đặt lại mật khẩu không hợp lệ hoặc đã hết hạn',
      )
    }

    const passwordHash = await bcrypt.hash(dto.newPassword, 10)
    await this.usersService.resetPassword(user.id, passwordHash)

    return { message: 'Đổi mật khẩu thành công! Vui lòng đăng nhập lại.' }
  }

  async getProfile(userId: string) {
    const user = await this.usersService.findById(userId)
    if (!user) throw new UnauthorizedException()
    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      phone: user.phone,
      avatarUrl: user.avatarUrl,
    }
  }

  async googleLogin(profile: GoogleProfile): Promise<GoogleAuthResult> {
    const { googleId, fullName, avatarUrl } = profile
    // Normalize để tránh mismatch hoa/thường (VD: ABC@Gmail.com vs abc@gmail.com)
    const email = profile.email?.toLowerCase().trim()

    // Tài khoản đã liên kết Google trước đó
    const byGoogleId = await this.usersService.findByGoogleId(googleId)
    if (byGoogleId) {
      // Recruiter đã từng link Google (không nên xảy ra, nhưng block để chắc chắn)
      if (byGoogleId.role === 'recruiter') {
        return { ok: false, reason: 'recruiter_oauth_not_allowed' }
      }
      return { ok: true, ...this.buildTokenResponse(byGoogleId) }
    }

    if (email) {
      const byEmail = await this.usersService.findByEmail(email)
      if (byEmail) {
        // Recruiter phải dùng email/password — không cho phép đăng nhập Google
        if (byEmail.role === 'recruiter') {
          return { ok: false, reason: 'recruiter_oauth_not_allowed' }
        }
        // Merge: candidate dùng email/password → liên kết googleId
        await this.usersService.linkGoogleId(byEmail.id, googleId, avatarUrl ?? undefined)
        byEmail.googleId = googleId
        if (avatarUrl) byEmail.avatarUrl = avatarUrl
        byEmail.isActive = true
        return { ok: true, ...this.buildTokenResponse(byEmail) }
      }
    }

    // Tạo mới candidate (Google đã xác thực email nên isActive = true)
    const newUser = await this.usersService.create({
      email: email ?? `google_${googleId}@placeholder.local`,
      passwordHash: null,
      fullName,
      role: 'candidate',
      googleId,
      avatarUrl,
      isActive: true,
    })
    return { ok: true, ...this.buildTokenResponse(newUser) }
  }

  private buildTokenResponse(user: { id: string; email: string; role: string; fullName: string; avatarUrl: string | null }) {
    const payload = { sub: user.id, email: user.email, role: user.role }
    const accessToken = this.jwtService.sign(payload)
    return {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        avatarUrl: user.avatarUrl,
      },
    }
  }
}
