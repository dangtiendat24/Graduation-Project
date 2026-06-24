import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import './LoginToast.css'

function getFirstName(fullName: string): string {
  const parts = fullName.trim().split(' ')
  return parts[parts.length - 1]
}

export default function LoginToast() {
  const location = useLocation()
  const [visible, setVisible] = useState(false)
  const [fading, setFading] = useState(false)
  const [userName, setUserName] = useState('')
  const handled = useRef(false)

  useEffect(() => {
    if (handled.current) return
    const state = location.state as { loginSuccess?: boolean; userName?: string } | null
    if (!state?.loginSuccess) return

    handled.current = true
    setUserName(state.userName ? getFirstName(state.userName) : '')
    setVisible(true)
    setFading(false)

    // Clear loginSuccess from history state to avoid re-showing on back/forward
    window.history.replaceState({}, document.title)

    const fadeTimer = setTimeout(() => setFading(true), 2800)
    const hideTimer = setTimeout(() => setVisible(false), 3300)

    return () => {
      clearTimeout(fadeTimer)
      clearTimeout(hideTimer)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  if (!visible) return null

  return (
    <div className={`lt-toast${fading ? ' lt-fading' : ''}`} role="status" aria-live="polite">
      <div className="lt-icon">
        <i className="ti ti-circle-check" />
      </div>
      <div className="lt-body">
        <div className="lt-title">Đăng nhập thành công!</div>
        {userName && <div className="lt-sub">Xin chào, {userName} 👋</div>}
      </div>
      <button className="lt-close" onClick={() => setVisible(false)} aria-label="Đóng">
        <i className="ti ti-x" />
      </button>
    </div>
  )
}
