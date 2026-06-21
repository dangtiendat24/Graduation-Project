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
}
