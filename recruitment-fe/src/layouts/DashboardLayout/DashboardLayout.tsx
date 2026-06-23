import { useLocation, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import './DashboardLayout.css'

interface NavItemProps {
  to: string
  icon: string
  label: string
  badge?: string
}

function NavItem({ to, icon, label, badge }: NavItemProps) {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const active = pathname === to || pathname.startsWith(to + '/')

  return (
    <div
      className={`dl-nav-item${active ? ' active' : ''}`}
      onClick={() => navigate(to)}
    >
      <i className={`ti ${icon} dl-nav-icon`} />
      <span>{label}</span>
      {badge && <span className="dl-nav-badge">{badge}</span>}
    </div>
  )
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

interface Props {
  children: React.ReactNode
  actions?: React.ReactNode
}

export default function DashboardLayout({ children, actions }: Props) {
  const { user, clearAuth } = useAuthStore()

  const prefix = user?.role === 'recruiter' ? '/recruiter' : '/candidate'

  function handleLogout() {
    clearAuth()
    window.location.replace('/')
  }

  return (
    <div className="dl-root">
      <aside className="dl-sidebar">
        <div className="dl-logo">
          <span className="dl-logo-dot" />
          <span className="dl-logo-name">
            Recruit<span>.AI</span>
          </span>
        </div>

        <div className="dl-nav-label">Tổng quan</div>
        <NavItem to={`${prefix}/dashboard`} icon="ti-layout-dashboard" label="Dashboard" />
        <NavItem to={`${prefix}/reports`} icon="ti-chart-bar" label="Báo cáo" />

        <div className="dl-nav-label">Tuyển dụng</div>
        <NavItem to={`${prefix}/jobs`} icon="ti-briefcase" label="Tin tuyển dụng" />
        <NavItem to={`${prefix}/candidates`} icon="ti-users" label="Ứng viên" />
        <NavItem to={`${prefix}/interviews`} icon="ti-calendar" label="Lịch phỏng vấn" badge="3" />

        <div className="dl-nav-label">Hệ thống</div>
        <NavItem to={`${prefix}/agents`} icon="ti-robot" label="AI Agents" />
        <NavItem to={`${prefix}/settings`} icon="ti-settings" label="Cài đặt" />

        {user?.role === 'recruiter' && (
          <>
            <div className="dl-nav-label">Công ty</div>
            <NavItem to="/recruiter/company" icon="ti-building" label="Hồ sơ công ty" />
          </>
        )}

        <div className="dl-sidebar-footer">
          <div className="dl-avatar">
            {user ? getInitials(user.fullName) : 'U'}
          </div>
          <div className="dl-user-info">
            <div className="dl-user-name">{user?.fullName ?? 'Người dùng'}</div>
            <div className="dl-user-role">
              {user?.role === 'recruiter' ? 'HR Manager' : 'Ứng viên'}
            </div>
          </div>
          <button className="dl-logout-btn" onClick={handleLogout} title="Đăng xuất">
            <i className="ti ti-logout" />
          </button>
        </div>
      </aside>

      <div className="dl-main">
        <header className="dl-topbar">
          <div className="dl-search">
            <i className="ti ti-search" />
            <span>Tìm ứng viên, tin tuyển dụng...</span>
          </div>
          <div className="dl-topbar-right">
            <div className="dl-icon-btn">
              <i className="ti ti-bell" />
              <span className="dl-dot" />
            </div>
            {actions}
          </div>
        </header>

        <main className="dl-content">{children}</main>
      </div>
    </div>
  )
}
