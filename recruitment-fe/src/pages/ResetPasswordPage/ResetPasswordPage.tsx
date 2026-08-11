import { useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import './ResetPasswordPage.css'

type Status = 'form' | 'success' | 'invalid'

const API = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000/api'

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const token = searchParams.get('token') ?? ''

  const [status, setStatus] = useState<Status>(token ? 'form' : 'invalid')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  const passwordTooShort = newPassword.length > 0 && newPassword.length < 8
  const passwordNoMatch = confirmPassword.length > 0 && newPassword !== confirmPassword
  const canSubmit = newPassword.length >= 8 && newPassword === confirmPassword

  async function handleSubmit(e: { preventDefault(): void }) {
    e.preventDefault()
    if (!canSubmit) return

    setIsLoading(true)
    setErrorMsg('')
    try {
      const res = await fetch(`${API}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword }),
      })
      const data = await res.json()
      if (!res.ok) {
        setStatus('invalid')
        setErrorMsg(data?.message ?? 'Link đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.')
      } else {
        setStatus('success')
      }
    } catch {
      setErrorMsg('Không thể kết nối đến máy chủ. Vui lòng thử lại sau.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="verify-page">
      <div className="verify-box">

        <div className="verify-logo">
          <div className="verify-logo-dot" />
          <span className="verify-logo-name">RECRUIT<span>.AI</span></span>
        </div>

        {status === 'form' && (
          <form className="rp-form" onSubmit={handleSubmit}>
            <p className="verify-title">Đặt lại mật khẩu</p>
            <p className="verify-sub">Nhập mật khẩu mới cho tài khoản của bạn.</p>

            {errorMsg && (
              <div className="rp-error"><i className="ti ti-alert-circle" /> {errorMsg}</div>
            )}

            <div className="rp-field">
              <label htmlFor="rp-pw">Mật khẩu mới</label>
              <input
                type="password"
                id="rp-pw"
                placeholder="Tối thiểu 8 ký tự"
                autoComplete="new-password"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
              />
              {passwordTooShort && <div className="rp-field-error">Mật khẩu tối thiểu 8 ký tự</div>}
            </div>

            <div className="rp-field">
              <label htmlFor="rp-pw2">Xác nhận mật khẩu mới</label>
              <input
                type="password"
                id="rp-pw2"
                placeholder="Nhập lại mật khẩu"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
              />
              {passwordNoMatch && <div className="rp-field-error">Mật khẩu chưa khớp</div>}
            </div>

            <button className="verify-btn" type="submit" disabled={!canSubmit || isLoading}>
              {isLoading ? 'Đang xử lý…' : 'Đặt lại mật khẩu'}
            </button>
          </form>
        )}

        {status === 'success' && (
          <>
            <div className="verify-icon success">
              <i className="ti ti-circle-check" />
            </div>
            <p className="verify-title">Đổi mật khẩu thành công!</p>
            <p className="verify-sub">Vui lòng đăng nhập lại bằng mật khẩu mới.</p>
            <button className="verify-btn" onClick={() => navigate('/login')}>
              Đăng nhập ngay
            </button>
          </>
        )}

        {status === 'invalid' && (
          <>
            <div className="verify-icon error">
              <i className="ti ti-circle-x" />
            </div>
            <p className="verify-title">Link không hợp lệ</p>
            <p className="verify-sub">
              {errorMsg || 'Link đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.'}
            </p>
            <button className="verify-btn outline" onClick={() => navigate('/login')}>
              Về trang đăng nhập
            </button>
          </>
        )}

      </div>
    </div>
  )
}
