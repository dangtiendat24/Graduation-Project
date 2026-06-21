import { Injectable, Logger, OnModuleInit } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import * as nodemailer from 'nodemailer'
import type { Transporter } from 'nodemailer'

@Injectable()
export class MailService implements OnModuleInit {
  private readonly logger = new Logger(MailService.name)
  private transporter: Transporter | null = null
  private readonly from: string
  private readonly frontendUrl: string
  private readonly devMode: boolean

  constructor(private readonly config: ConfigService) {
    this.from = config.get<string>('SMTP_FROM', 'RecruitAI <noreply@recruitai.com>')
    this.frontendUrl = config.get<string>('FRONTEND_URL', 'http://localhost:5173')
    this.devMode = !config.get<string>('SMTP_USER')
  }

  onModuleInit() {
    if (this.devMode) {
      this.logger.warn('SMTP_USER chưa được cấu hình — email sẽ được in ra console (dev mode)')
      return
    }

    this.transporter = nodemailer.createTransport({
      host: this.config.get<string>('SMTP_HOST', 'smtp.gmail.com'),
      port: this.config.get<number>('SMTP_PORT', 587),
      secure: false,
      auth: {
        user: this.config.get<string>('SMTP_USER'),
        pass: this.config.get<string>('SMTP_PASS'),
      },
    })
  }

  async sendVerificationEmail(to: string, fullName: string, token: string) {
    const verifyUrl = `${this.frontendUrl}/verify-email?token=${token}`

    if (this.devMode || !this.transporter) {
      this.logger.log(`[DEV] Verification link for ${to}: ${verifyUrl}`)
      return
    }

    await this.transporter.sendMail({
      from: this.from,
      to,
      subject: '[RecruitAI] Xác nhận địa chỉ email của bạn',
      html: buildVerifyEmailHtml(fullName, verifyUrl),
    })
  }
}

function buildVerifyEmailHtml(fullName: string, verifyUrl: string): string {
  return `<!DOCTYPE html>
<html lang="vi">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Xác nhận email</title></head>
<body style="margin:0;padding:0;background:#F1F5F9;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F1F5F9;padding:40px 16px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#FFFFFF;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.08);">

        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(150deg,#0C2340 0%,#0F172A 48%,#1E1065 100%);padding:28px 40px;">
            <span style="font-size:20px;font-weight:700;color:#FFFFFF;letter-spacing:.04em;">
              RECRUIT<span style="color:#5EEAD4;">.AI</span>
            </span>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:36px 40px 28px;">
            <p style="margin:0 0 8px;font-size:22px;font-weight:700;color:#0F172A;">Xin chào, ${fullName}!</p>
            <p style="margin:0 0 24px;font-size:15px;color:#475569;line-height:1.6;">
              Cảm ơn bạn đã đăng ký tài khoản tại <strong>RecruitAI</strong>.<br>
              Nhấn nút bên dưới để xác nhận email và kích hoạt tài khoản của bạn.
            </p>

            <table cellpadding="0" cellspacing="0"><tr><td>
              <a href="${verifyUrl}"
                style="display:inline-block;background:#4338CA;color:#FFFFFF;font-size:15px;font-weight:600;padding:13px 32px;border-radius:8px;text-decoration:none;letter-spacing:.02em;">
                Xác nhận email →
              </a>
            </td></tr></table>

            <p style="margin:24px 0 0;font-size:13px;color:#94A3B8;line-height:1.6;">
              Liên kết có hiệu lực trong <strong>24 giờ</strong>.<br>
              Nếu bạn không đăng ký tài khoản này, hãy bỏ qua email này.
            </p>
          </td>
        </tr>

        <!-- Link fallback -->
        <tr>
          <td style="padding:0 40px 28px;">
            <p style="margin:0;font-size:12px;color:#CBD5E1;">Hoặc dán đường dẫn này vào trình duyệt:</p>
            <p style="margin:4px 0 0;font-size:12px;color:#4338CA;word-break:break-all;">${verifyUrl}</p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#F8FAFC;padding:16px 40px;border-top:1px solid #E2E8F0;">
            <p style="margin:0;font-size:12px;color:#94A3B8;text-align:center;">
              © 2026 RecruitAI — Nền tảng tuyển dụng thông minh
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`
}
