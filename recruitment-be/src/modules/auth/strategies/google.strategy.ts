import { Injectable } from '@nestjs/common'
import { PassportStrategy } from '@nestjs/passport'
import { Strategy, VerifyCallback, Profile } from 'passport-google-oauth20'
import { ConfigService } from '@nestjs/config'
import { AuthService } from '../auth.service'

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(
    config: ConfigService,
    private readonly authService: AuthService,
  ) {
    super({
      clientID: config.get<string>('GOOGLE_CLIENT_ID', 'PLACEHOLDER'),
      clientSecret: config.get<string>('GOOGLE_CLIENT_SECRET', 'PLACEHOLDER'),
      callbackURL: config.get<string>('GOOGLE_LOGIN_CALLBACK_URL', 'http://localhost:3000/api/auth/google/callback'),
      scope: ['email', 'profile'],
    })
  }

  async validate(
    _accessToken: string,
    _refreshToken: string,
    profile: Profile,
    done: VerifyCallback,
  ) {
    const email = profile.emails?.[0]?.value
    const googleId = profile.id
    const fullName = profile.displayName ?? email ?? googleId
    const avatarUrl = profile.photos?.[0]?.value ?? null

    const user = await this.authService.googleLogin({ email, googleId, fullName, avatarUrl })
    done(null, user)
  }
}
