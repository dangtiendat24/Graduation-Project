import { useEffect, useRef, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import './VerifyEmailPage.css'

type Status = 'loading' | 'success' | 'error'

const API = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000/api'

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [status, setStatus] = useState<Status>('loading')
  const [errorMsg, setErrorMsg] = useState('')
  const [countdown, setCountdown] = useState(3)
  // React StrictMode gọi useEffect 2 lần trong dev — guard này ngăn gọi API lần 2
  const hasFetched = useRef(false)

  useEffect(() => {
    if (hasFetched.current) return
    hasFetched.current = true

    const token = searchParams.get('token')
    if (!token) {
      setStatus('error')
      setErrorMsg('Link xác nhận không hợp lệ hoặc đã bị hỏng.')
      return
    }

    fetch(`${API}/auth/verify-email?token=${encodeURIComponent(token)}`)
      .then(async res => {
        const data = await res.json()
        if (!res.ok) {
          setStatus('error')
          setErrorMsg(data?.message ?? 'Xác nhận thất bại. Vui lòng thử lại.')
        } else {
          setStatus('success')
        }
      })
      .catch(() => {
        setStatus('error')
        setErrorMsg('Không thể kết nối đến máy chủ. Vui lòng thử lại sau.')
      })
  }, [])

  // Đếm ngược rồi chuyển sang /login
  useEffect(() => {
    if (status !== 'success') return
    if (countdown <= 0) { navigate('/login'); return }
    const t = setTimeout(() => setCountdown(c => c - 1), 1000)
    return () => clearTimeout(t)
  }, [status, countdown, navigate])

  return (
    <div className="verify-page">
      <div className="verify-box">

        <div className="verify-logo">
          <div className="verify-logo-dot" />
          <span className="verify-logo-name">RECRUIT<span>.AI</span></span>
        </div>

        {status === 'loading' && (
          <>
            <div className="spinner" />
            <p className="verify-title">Đang xác thực email…</p>
            <p className="verify-sub">Vui lòng đợi trong giây lát</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="verify-icon success">
              <i className="ti ti-circle-check" />
            </div>
            <p className="verify-title">Xác nhận thành công!</p>
            <p className="verify-sub">
              Tài khoản của bạn đã được kích hoạt.<br />
              Tự động chuyển đến đăng nhập sau <strong>{countdown}s</strong>…
            </p>
            <button className="verify-btn" onClick={() => navigate('/login')}>
              Đăng nhập ngay
            </button>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="verify-icon error">
              <i className="ti ti-circle-x" />
            </div>
            <p className="verify-title">Xác nhận thất bại</p>
            <p className="verify-sub">{errorMsg}</p>
            <button className="verify-btn outline" onClick={() => navigate('/')}>
              Về trang chủ
            </button>
          </>
        )}

      </div>
    </div>
  )
}
