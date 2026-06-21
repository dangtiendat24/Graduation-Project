import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  UseGuards,
  Request,
  Res,
  HttpCode,
  HttpStatus,
} from '@nestjs/common'
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery, ApiExcludeEndpoint } from '@nestjs/swagger'
import type { Response } from 'express'
import { ConfigService } from '@nestjs/config'
import { AuthService } from './auth.service'
import { RegisterDto } from './dto/register.dto'
import { LoginDto } from './dto/login.dto'
import { JwtAuthGuard } from './guards/jwt-auth.guard'
import { GoogleAuthGuard } from './guards/google-auth.guard'

interface GoogleCallbackUser {
  accessToken: string
  user: { id: string; email: string; fullName: string; role: string; avatarUrl: string | null }
}

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  @ApiOperation({ summary: 'Đăng ký tài khoản — gửi email xác nhận' })
  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto)
  }

  @ApiOperation({ summary: 'Xác nhận email qua token' })
  @ApiQuery({ name: 'token', description: 'Token từ email xác nhận', required: true })
  @Get('verify-email')
  verifyEmail(@Query('token') token: string) {
    return this.authService.verifyEmail(token)
  }

  @ApiOperation({ summary: 'Đăng nhập — trả về JWT' })
  @HttpCode(HttpStatus.OK)
  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto)
  }

  @ApiOperation({ summary: 'Lấy thông tin profile hiện tại' })
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  @Get('me')
  getProfile(@Request() req: { user: { id: string } }) {
    return this.authService.getProfile(req.user.id)
  }

  @ApiOperation({ summary: 'Đăng nhập/đăng ký bằng Google (chỉ dành cho Candidate)' })
  @UseGuards(GoogleAuthGuard)
  @Get('google')
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  googleLogin() {}

  @ApiExcludeEndpoint()
  @UseGuards(GoogleAuthGuard)
  @Get('google/callback')
  googleCallback(
    @Request() req: { user: GoogleCallbackUser },
    @Res() res: Response,
  ) {
    const { accessToken, user } = req.user
    const frontendUrl = this.configService.get<string>('FRONTEND_URL', 'http://localhost:5173')
    const params = new URLSearchParams({
      token: accessToken,
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      ...(user.avatarUrl ? { avatarUrl: user.avatarUrl } : {}),
    })
    res.redirect(`${frontendUrl}/auth/callback?${params.toString()}`)
  }
}
