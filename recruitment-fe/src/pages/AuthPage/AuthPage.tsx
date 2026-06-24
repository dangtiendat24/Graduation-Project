import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import './AuthPage.css'

type Tab = 'login' | 'register'
type Role = 'recruiter' | 'candidate'

const STRENGTH_LABELS = ['', 'Yếu', 'Trung bình', 'Khá mạnh', 'Rất mạnh']
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const API = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000/api'

function handleGoogleLogin() {
  window.location.href = `${API}/auth/google`
}

function validateEmail(v: string): string {
  if (!v) return 'Email không được để trống'
  if (!EMAIL_RE.test(v)) return 'Email không hợp lệ (ví dụ: ban@congty.com)'
  return ''
}

function calcStrength(v: string): number {
  let s = 0
  if (v.length >= 8)            s++
  if (/[A-Z]/.test(v))         s++
  if (/[0-9]/.test(v))         s++
  if (/[^A-Za-z0-9]/.test(v))  s++
  return s
}

const OAUTH_ERRORS: Record<string, string> = {
  recruiter_oauth_not_allowed:
    'Tài khoản nhà tuyển dụng phải đăng nhập bằng email và mật khẩu, không hỗ trợ đăng nhập Google.',
}

export default function AuthPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const initialTab = (searchParams.get('tab') as Tab) ?? 'login'
  const oauthError = searchParams.get('error')

  const { setAuth } = useAuthStore()
  const [tab, setTab] = useState<Tab>(initialTab)

  /* ── Login state ── */
  const [loginEmail, setLoginEmail]       = useState('')
  const [loginEmailErr, setLoginEmailErr] = useState('')
  const [loginPw, setLoginPw]             = useState('')
  const [showLoginPw, setShowLoginPw]     = useState(false)
  const [remember, setRemember]           = useState(false)

  /* ── Register state ── */
  const [regName, setRegName]             = useState('')
  const [regEmail, setRegEmail]           = useState('')
  const [regEmailErr, setRegEmailErr]     = useState('')
  const [regPw, setRegPw]                 = useState('')
  const [regPw2, setRegPw2]               = useState('')
  const [showRegPw, setShowRegPw]         = useState(false)
  const [showRegPw2, setShowRegPw2]       = useState(false)
  const [role, setRole]                   = useState<Role>('recruiter')
  const [terms, setTerms]                 = useState(false)
  const [strength, setStrength]           = useState(0)
  const [registerSuccess, setRegisterSuccess] = useState(false)

  /* ── Shared API state ── */
  const [isLoading, setIsLoading] = useState(false)
  const [apiError, setApiError]   = useState('')

  const passwordMatch   = regPw2.length > 0 && regPw === regPw2
  const passwordNoMatch = regPw2.length > 0 && regPw !== regPw2

  function handleRegPwChange(v: string) {
    setRegPw(v)
    setStrength(calcStrength(v))
  }

  async function handleLogin(e: { preventDefault(): void }) {
    e.preventDefault()
    const emailErr = validateEmail(loginEmail)
    if (emailErr) { setLoginEmailErr(emailErr); return }
    if (!loginPw) return

    setIsLoading(true)
    setApiError('')
    try {
      const res = await fetch(`${API}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail, password: loginPw }),
      })
      const data = await res.json()
      if (!res.ok) {
        setApiError(data.message ?? 'Đăng nhập thất bại')
      } else {
        setAuth(data.user, data.accessToken)
        const role = data.user?.role as string
        navigate(
          role === 'recruiter' ? '/recruiter/dashboard' : '/candidate/dashboard',
          { state: { loginSuccess: true, userName: data.user?.fullName ?? '' } },
        )
      }
    } catch {
      setApiError('Không thể kết nối đến máy chủ. Vui lòng thử lại.')
    } finally {
      setIsLoading(false)
    }
  }

  async function handleRegister(e: { preventDefault(): void }) {
    e.preventDefault()
    const emailErr = validateEmail(regEmail)
    if (emailErr) { setRegEmailErr(emailErr); return }
    if (!regName || !regPw || !regPw2) return
    if (regPw !== regPw2) return
    if (!terms) return

    setIsLoading(true)
    setApiError('')
    try {
      const res = await fetch(`${API}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName: regName, email: regEmail, password: regPw, role }),
      })
      const data = await res.json()
      if (!res.ok) {
        setApiError(data.message ?? 'Đăng ký thất bại')
      } else {
        setRegisterSuccess(true)
      }
    } catch {
      setApiError('Không thể kết nối đến máy chủ. Vui lòng thử lại.')
    } finally {
      setIsLoading(false)
    }
  }

  function switchTab(t: Tab) {
    setTab(t)
    setApiError('')
    setRegisterSuccess(false)
  }

  return (
    <div className="auth-page">
      {/* Back button */}
      <button className="auth-back" onClick={() => navigate('/')}>
        <i className="ti ti-arrow-left" />
        Trang chủ
      </button>

      <div className="auth-card">
        {/* ══ LEFT: BRAND PANEL ══ */}
        <div className="brand">
          <div className="brand-logo">
            <div className="brand-logo-dot" />
            <span className="brand-logo-name">RECRUIT<span>.AI</span></span>
          </div>
          <div className="brand-tagline">Nền tảng tuyển dụng thông minh</div>

          <div className="steps">
            <div className="step-item">
              <div className="step-num done">
                <i className="ti ti-check" style={{ fontSize: 13 }} />
              </div>
              <div className="step-body">
                <div className="step-name">Trích xuất CV</div>
                <div className="step-desc">Agent 1 đọc &amp; cấu trúc hoá hồ sơ<br />trong vài giây</div>
              </div>
            </div>

            <div className="step-item">
              <div className="step-num done">
                <i className="ti ti-check" style={{ fontSize: 13 }} />
              </div>
              <div className="step-body">
                <div className="step-name">So khớp JD</div>
                <div className="step-desc">Chấm điểm 0–100 theo kỹ năng,<br />kinh nghiệm, học vấn</div>
              </div>
            </div>

            <div className="step-item">
              <div className="step-num current">3</div>
              <div className="step-body">
                <div className="step-name">Phỏng vấn AI</div>
                <div className="step-desc">Chat hoặc giọng nói, chấm điểm<br />theo 4 tiêu chí</div>
              </div>
            </div>

            <div className="step-item">
              <div className="step-num pending">4</div>
              <div className="step-body">
                <div className="step-name">Xếp lịch tự động</div>
                <div className="step-desc">Đọc Google Calendar, gợi ý<br />3–5 khung giờ trống</div>
              </div>
            </div>

            <div className="step-item">
              <div className="step-num pending">5</div>
              <div className="step-body">
                <div className="step-name">Báo cáo tổng hợp</div>
                <div className="step-desc">Tóm tắt, điểm mạnh/yếu,<br />đề xuất pass/fail</div>
              </div>
            </div>
          </div>

          <div className="brand-quote">
            <p>"5 AI Agent phối hợp liền mạch, thay thế những công việc thủ công tốn thời gian nhất trong tuyển dụng."</p>
          </div>
        </div>

        {/* ══ RIGHT: FORM PANEL ══ */}
        <div className="form-panel">
          <div className="screen-tag">
            <i className="ti ti-layout-2" style={{ fontSize: 11 }} />
            <span>{tab === 'login' ? '/login' : '/register'}</span>
          </div>

          {/* Tabs */}
          <div className="tab-row">
            <button
              className={`tab-btn${tab === 'login' ? ' active' : ''}`}
              onClick={() => switchTab('login')}
            >
              Đăng nhập
            </button>
            <button
              className={`tab-btn${tab === 'register' ? ' active' : ''}`}
              onClick={() => switchTab('register')}
            >
              Đăng ký
            </button>
          </div>

          {/* ── LOGIN FORM ── */}
          {tab === 'login' && (
            <form onSubmit={handleLogin}>
              <div className="form-title">Chào mừng trở lại</div>
              <div className="form-sub">Đăng nhập để tiếp tục quy trình tuyển dụng của bạn</div>

              {oauthError && (
                <div className="api-error">
                  <i className="ti ti-alert-circle" />
                  {OAUTH_ERRORS[oauthError] ?? 'Đăng nhập Google thất bại. Vui lòng thử lại.'}
                </div>
              )}
              {apiError && <div className="api-error"><i className="ti ti-alert-circle" /> {apiError}</div>}

              <div className="field">
                <label htmlFor="li-email">Email</label>
                <input
                  type="email"
                  id="li-email"
                  placeholder="ban@congty.com"
                  autoComplete="email"
                  value={loginEmail}
                  onChange={e => { setLoginEmail(e.target.value); if (loginEmailErr) setLoginEmailErr('') }}
                  onBlur={e => setLoginEmailErr(validateEmail(e.target.value))}
                  style={loginEmailErr ? { borderColor: 'var(--color-danger)' } : {}}
                />
                {loginEmailErr && <div className="field-error">{loginEmailErr}</div>}
              </div>

              <div className="field">
                <label htmlFor="li-pw">Mật khẩu</label>
                <div className="pw-wrap">
                  <input
                    type={showLoginPw ? 'text' : 'password'}
                    id="li-pw"
                    placeholder="••••••••"
                    autoComplete="current-password"
                    value={loginPw}
                    onChange={e => setLoginPw(e.target.value)}
                  />
                  <button
                    type="button"
                    className="pw-toggle"
                    onClick={() => setShowLoginPw(p => !p)}
                    aria-label="Hiện/ẩn mật khẩu"
                  >
                    <i className={`ti ${showLoginPw ? 'ti-eye-off' : 'ti-eye'}`} />
                  </button>
                </div>
              </div>

              <div className="form-row">
                <label className="check-inline">
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={e => setRemember(e.target.checked)}
                  />
                  Ghi nhớ đăng nhập 7 ngày
                </label>
                <button type="button" className="forgot-link">Quên mật khẩu?</button>
              </div>

              <button type="submit" className="btn-primary" disabled={isLoading}>
                {isLoading ? <><span className="btn-spinner" /> Đang đăng nhập…</> : <>Đăng nhập <i className="ti ti-arrow-right" /></>}
              </button>

              <div className="or-row">
                <div className="or-line" />
                <span className="or-text">hoặc</span>
                <div className="or-line" />
              </div>

              <button type="button" className="btn-google" onClick={handleGoogleLogin}>
                <svg className="google-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Tiếp tục với Google
                <span className="google-badge">Ứng viên</span>
              </button>

              <div className="switch-link">
                Chưa có tài khoản?{' '}
                <button type="button" onClick={() => switchTab('register')}>Đăng ký ngay</button>
              </div>
            </form>
          )}

          {/* ── REGISTER FORM ── */}
          {tab === 'register' && (
            registerSuccess ? (
              /* ── REGISTER SUCCESS ── */
              <div className="register-success">
                <div className="register-success-icon">
                  <i className="ti ti-mail-check" />
                </div>
                <p className="form-title">Kiểm tra email của bạn!</p>
                <p className="form-sub">
                  Chúng tôi đã gửi link xác nhận đến<br />
                  <strong>{regEmail}</strong>
                </p>
                <p className="form-sub" style={{ fontSize: 'var(--fs-label)', marginBottom: 0 }}>
                  Nhấn vào link trong email để kích hoạt tài khoản.<br />
                  Link có hiệu lực trong <strong>24 giờ</strong>.
                </p>
                <div className="switch-link" style={{ marginTop: '1.5rem' }}>
                  Đã xác nhận?{' '}
                  <button type="button" onClick={() => switchTab('login')}>Đăng nhập</button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleRegister}>
                <div className="form-title">Tạo tài khoản</div>
                <div className="form-sub">Bắt đầu tự động hoá quy trình tuyển dụng trong vài phút</div>

                {apiError && <div className="api-error"><i className="ti ti-alert-circle" /> {apiError}</div>}

                <div className="field">
                  <label htmlFor="re-name">Họ và tên</label>
                  <input
                    type="text"
                    id="re-name"
                    placeholder="Nguyễn Văn A"
                    autoComplete="name"
                    value={regName}
                    onChange={e => setRegName(e.target.value)}
                  />
                </div>

                <div className="field">
                  <label htmlFor="re-email">Email</label>
                  <input
                    type="email"
                    id="re-email"
                    placeholder="ban@congty.com"
                    autoComplete="email"
                    value={regEmail}
                    onChange={e => { setRegEmail(e.target.value); if (regEmailErr) setRegEmailErr('') }}
                    onBlur={e => setRegEmailErr(validateEmail(e.target.value))}
                    style={regEmailErr ? { borderColor: 'var(--color-danger)' } : {}}
                  />
                  {regEmailErr && <div className="field-error">{regEmailErr}</div>}
                </div>

                <div className="field">
                  <label htmlFor="re-pw">Mật khẩu</label>
                  <div className="pw-wrap">
                    <input
                      type={showRegPw ? 'text' : 'password'}
                      id="re-pw"
                      placeholder="Tối thiểu 8 ký tự"
                      autoComplete="new-password"
                      value={regPw}
                      onChange={e => handleRegPwChange(e.target.value)}
                    />
                    <button
                      type="button"
                      className="pw-toggle"
                      onClick={() => setShowRegPw(p => !p)}
                      aria-label="Hiện/ẩn mật khẩu"
                    >
                      <i className={`ti ${showRegPw ? 'ti-eye-off' : 'ti-eye'}`} />
                    </button>
                  </div>
                  <div className="strength-wrap">
                    {[1, 2, 3, 4].map(i => (
                      <div key={i} className={`seg s${i}${i <= strength ? ' on' : ''}`} />
                    ))}
                  </div>
                  <div className="strength-label">
                    {regPw ? STRENGTH_LABELS[strength] : 'Nhập mật khẩu để kiểm tra độ mạnh'}
                  </div>
                </div>

                <div className="field">
                  <label htmlFor="re-pw2">Xác nhận mật khẩu</label>
                  <div className="pw-wrap">
                    <input
                      type={showRegPw2 ? 'text' : 'password'}
                      id="re-pw2"
                      placeholder="Nhập lại mật khẩu"
                      autoComplete="new-password"
                      value={regPw2}
                      onChange={e => setRegPw2(e.target.value)}
                      style={
                        regPw2
                          ? { borderColor: passwordMatch ? 'var(--color-teal)' : 'var(--color-danger)' }
                          : {}
                      }
                    />
                    <button
                      type="button"
                      className="pw-toggle"
                      onClick={() => setShowRegPw2(p => !p)}
                      aria-label="Hiện/ẩn mật khẩu"
                    >
                      <i className={`ti ${showRegPw2 ? 'ti-eye-off' : 'ti-eye'}`} />
                    </button>
                  </div>
                  {passwordMatch && (
                    <div className="confirm-msg match">
                      <i className="ti ti-circle-check" style={{ verticalAlign: -2, marginRight: 3 }} />
                      Mật khẩu khớp
                    </div>
                  )}
                  {passwordNoMatch && (
                    <div className="confirm-msg no-match">
                      <i className="ti ti-circle-x" style={{ verticalAlign: -2, marginRight: 3 }} />
                      Mật khẩu chưa khớp
                    </div>
                  )}
                  {!regPw2 && <div className="confirm-msg" />}
                </div>

                <div className="field">
                  <label>Tôi là</label>
                  <div className="role-grid">
                    <div
                      className={`role-card${role === 'recruiter' ? ' selected' : ''}`}
                      onClick={() => setRole('recruiter')}
                    >
                      <i className="ti ti-briefcase" />
                      <div className="role-card-name">Nhà tuyển dụng</div>
                      <div className="role-card-desc">Quản lý JD &amp; ứng viên</div>
                    </div>
                    <div
                      className={`role-card${role === 'candidate' ? ' selected' : ''}`}
                      onClick={() => setRole('candidate')}
                    >
                      <i className="ti ti-user" />
                      <div className="role-card-name">Ứng viên</div>
                      <div className="role-card-desc">Nộp CV &amp; phỏng vấn AI</div>
                    </div>
                  </div>
                </div>

                <div className="check-row">
                  <input
                    type="checkbox"
                    id="terms"
                    checked={terms}
                    onChange={e => setTerms(e.target.checked)}
                  />
                  <label htmlFor="terms">
                    Tôi đồng ý với <a href="#">Điều khoản sử dụng</a> và{' '}
                    <a href="#">Chính sách bảo mật</a> của RecruitAI
                  </label>
                </div>

                <button
                  type="submit"
                  className="btn-primary"
                  disabled={!terms || passwordNoMatch || isLoading}
                >
                  {isLoading
                    ? <><span className="btn-spinner" /> Đang tạo tài khoản…</>
                    : <>Tạo tài khoản <i className="ti ti-arrow-right" /></>}
                </button>

                <div className="or-row">
                  <div className="or-line" />
                  <span className="or-text">hoặc</span>
                  <div className="or-line" />
                </div>

                {role === 'candidate' && (
                  <button type="button" className="btn-google" onClick={handleGoogleLogin}>
                    <svg className="google-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                    </svg>
                    Đăng ký với Google
                  </button>
                )}

                <div className="switch-link" style={role === 'candidate' ? { marginTop: 12 } : {}}>
                  Đã có tài khoản?{' '}
                  <button type="button" onClick={() => switchTab('login')}>Đăng nhập</button>
                </div>
              </form>
            )
          )}
        </div>
      </div>
    </div>
  )
}
