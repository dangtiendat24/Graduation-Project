import { useLocation, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import './CandidateLayout.css'

function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

const NAV_LINKS = [
  { label: 'Trang chủ',        to: '/candidate/dashboard' },
  { label: 'Việc làm',         to: '/candidate/jobs' },
  { label: 'Hồ sơ ứng tuyển', to: '/candidate/applications' },
  { label: 'Hồ sơ của tôi',   to: '/candidate/profile' },
]

interface Props {
  children: React.ReactNode
}

export default function CandidateLayout({ children }: Props) {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const { user, clearAuth } = useAuthStore()

  function handleLogout() {
    clearAuth()
    navigate('/')
  }

  return (
    <div style={{ background: 'var(--bg-page)', minHeight: '100vh' }}>
      <nav className="cl-navbar">
        <div className="cl-nav-left">
          <div className="cl-logo" onClick={() => navigate('/')}>
            <span className="cl-logo-dot" />
            <span className="cl-logo-name">Recruit<span>.AI</span></span>
          </div>

          <div className="cl-nav-links">
            {NAV_LINKS.map((link) => (
              <span
                key={link.to}
                className={`cl-nav-link${pathname === link.to ? ' active' : ''}`}
                onClick={() => navigate(link.to)}
              >
                {link.label}
              </span>
            ))}
          </div>
        </div>

        <div className="cl-nav-right">
          <div className="cl-icon-btn">
            <i className="ti ti-bell" />
            <span className="cl-dot" />
          </div>

          <div className="cl-avatar-wrap">
            <div className="cl-avatar">
              {user ? getInitials(user.fullName) : 'U'}
            </div>
            <div className="cl-avatar-menu">
              <button onClick={handleLogout}>
                <i className="ti ti-logout" />
                Đăng xuất
              </button>
            </div>
          </div>
        </div>
      </nav>

      {children}
    </div>
  )
}
