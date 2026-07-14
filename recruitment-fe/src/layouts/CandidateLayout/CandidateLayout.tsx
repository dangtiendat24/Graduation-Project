import { useLocation, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import LoginToast from '../../components/LoginToast/LoginToast'
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

function getFirstName(fullName: string): string {
  const parts = fullName.trim().split(' ')
  return parts[parts.length - 1]
}

function formatDate(): string {
  const days = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy']
  const months = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12']
  const d = new Date()
  return `${days[d.getDay()]}, ${d.getDate()} tháng ${months[d.getMonth()]} năm ${d.getFullYear()}`
}

interface NavItemProps {
  to: string
  icon: string
  label: string
}

function NavItem({ to, icon, label }: NavItemProps) {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const active = pathname === to || pathname.startsWith(to + '/')

  return (
    <div
      className={`csl-nav-item${active ? ' active' : ''}`}
      onClick={() => navigate(to)}
    >
      <i className={`ti ${icon}`} />
      <span>{label}</span>
    </div>
  )
}

interface Props {
  children: React.ReactNode
}

export default function CandidateLayout({ children }: Props) {
  const navigate = useNavigate()
  const { user, clearAuth } = useAuthStore()
  const firstName = user ? getFirstName(user.fullName) : 'bạn'

  function handleLogout() {
    clearAuth()
    window.location.replace('/')
  }

  return (
    <div className="csl-root">
      {/* ── Sidebar ── */}
      <aside className="csl-sidebar">
        <div className="csl-logo" onClick={() => navigate('/')}>
          <span className="csl-logo-dot" />
          <span className="csl-logo-name">Recruit<span>.AI</span></span>
        </div>

        <nav className="csl-nav">
          <div className="csl-nav-label">Tổng quan</div>
          <NavItem to="/candidate/dashboard" icon="ti-layout-dashboard" label="Dashboard" />

          <div className="csl-nav-label">Ứng tuyển</div>
          <NavItem to="/candidate/jobs"         icon="ti-briefcase"        label="Việc làm" />
          <NavItem to="/candidate/applications" icon="ti-send"             label="Đơn đã nộp" />
          <NavItem to="/candidate/interview"    icon="ti-message-chatbot"  label="Phỏng vấn AI" />
          <NavItem to="/candidate/schedule"     icon="ti-calendar"         label="Lịch phỏng vấn" />

          <div className="csl-nav-label">Tài khoản</div>
          <NavItem to="/candidate/profile" icon="ti-user-circle" label="Hồ sơ cá nhân" />
        </nav>

        <div className="csl-sidebar-footer">
          <div className="csl-avatar">
            {user ? getInitials(user.fullName) : 'U'}
          </div>
          <div className="csl-user-info">
            <div className="csl-user-name">{user?.fullName ?? 'Người dùng'}</div>
            <div className="csl-user-role">Ứng viên</div>
          </div>
          <button className="csl-logout-btn" onClick={handleLogout} title="Đăng xuất">
            <i className="ti ti-logout" />
          </button>
        </div>
      </aside>

      {/* ── Main area ── */}
      <div className="csl-main">
        <header className="csl-topbar">
          <div className="csl-topbar-left">
            <div className="csl-greeting">Xin chào, {firstName} 👋</div>
            <div className="csl-date">{formatDate()}</div>
          </div>
          <div className="csl-topbar-right">
            <div className="csl-icon-btn">
              <i className="ti ti-bell" />
              <span className="csl-dot" />
            </div>
            <button className="csl-btn-primary" onClick={() => navigate('/candidate/jobs')}>
              <i className="ti ti-briefcase" />
              Tìm việc làm
            </button>
          </div>
        </header>

        <main className="csl-content">{children}</main>
      </div>

      <LoginToast />
    </div>
  )
}
