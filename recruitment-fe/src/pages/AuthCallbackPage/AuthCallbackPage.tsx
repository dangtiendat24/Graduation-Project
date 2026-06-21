import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import './AuthCallbackPage.css'

export default function AuthCallbackPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { setAuth } = useAuthStore()
  const [error, setError] = useState('')
  const processed = useRef(false)

  useEffect(() => {
    // StrictMode fires twice — chỉ xử lý 1 lần
    if (processed.current) return
    processed.current = true

    const token    = searchParams.get('token')
    const id       = searchParams.get('id')
    const email    = searchParams.get('email')
    const fullName = searchParams.get('fullName')
    const role     = searchParams.get('role') as 'recruiter' | 'candidate' | null
    const avatarUrl = searchParams.get('avatarUrl')

    if (!token || !id || !email || !fullName || !role) {
      setError('Đăng nhập Google thất bại. Vui lòng thử lại.')
      return
    }

    setAuth({ id, email, fullName, role, ...(avatarUrl ? { avatarUrl } : {}) }, token)

    const dest = role === 'recruiter' ? '/recruiter/dashboard' : '/candidate/dashboard'
    navigate(dest, { replace: true })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  if (error) {
    return (
      <div className="auth-cb-page">
        <div className="auth-cb-box auth-cb-error">
          <i className="ti ti-alert-circle auth-cb-icon error" />
          <p className="auth-cb-msg">{error}</p>
          <button className="auth-cb-back" onClick={() => navigate('/login', { replace: true })}>
            Quay lại đăng nhập
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="auth-cb-page">
      <div className="auth-cb-box">
        <span className="auth-cb-spinner" />
        <p className="auth-cb-msg">Đang hoàn tất đăng nhập…</p>
      </div>
    </div>
  )
}
