import { useNavigate } from 'react-router-dom'
import DashboardLayout from '../../layouts/DashboardLayout/DashboardLayout'
import { useAuthStore } from '../../store/authStore'
import './RecruiterDashboardPage.css'

/* ── Static data matching the design mockup ── */

const METRICS = [
  {
    label: 'Ứng viên mới',
    value: 248,
    delta: '↑ 18% so với tuần trước',
    deltaType: 'up' as const,
    icon: 'ti-user-plus',
    iconColor: 'indigo',
  },
  {
    label: 'Agent đang xử lý',
    value: 37,
    delta: 'Sàng lọc & phỏng vấn tự động',
    deltaType: 'flat' as const,
    icon: 'ti-robot',
    iconColor: 'teal',
  },
  {
    label: 'Cần hành động',
    value: 12,
    delta: 'Chờ duyệt lịch phỏng vấn',
    deltaType: 'amber' as const,
    icon: 'ti-alert-circle',
    iconColor: 'amber',
  },
  {
    label: 'Đã tuyển tháng này',
    value: 9,
    delta: '↑ 3 so với tháng trước',
    deltaType: 'up' as const,
    icon: 'ti-user-check',
    iconColor: 'green',
  },
]

const PIPELINE = [
  { label: 'Vừa nộp đơn',      count: 248, pct: 100, color: 'var(--status-pending)' },
  { label: 'AI đã chấm điểm',  count: 178, pct: 72,  color: 'var(--status-matched)' },
  { label: 'Phỏng vấn AI',     count: 94,  pct: 38,  color: 'var(--status-interviewed)' },
  { label: 'Chờ lịch / đã hẹn',count: 44,  pct: 18,  color: 'var(--status-scheduled)' },
  { label: 'Đã tuyển',         count: 9,   pct: 4,   color: 'var(--status-hired)' },
]

const APPLICATIONS = [
  { initials: 'NH', name: 'Nguyễn Hoàng',  role: 'Senior Backend Dev',  position: 'Backend Engineer',  score: 87, scoreClass: 'high', status: 'interviewed', statusLabel: 'Đã phỏng vấn AI' },
  { initials: 'TL', name: 'Trần Lan Anh',  role: 'Product Designer',    position: 'UI/UX Designer',    score: 81, scoreClass: 'high', status: 'schedule',    statusLabel: 'Chờ chọn lịch' },
  { initials: 'PV', name: 'Phạm Văn Đức',  role: 'Data Analyst',        position: 'Data Analyst',      score: 62, scoreClass: 'mid',  status: 'matched',     statusLabel: 'Đã chấm điểm' },
  { initials: 'LM', name: 'Lê Minh Khôi',  role: 'DevOps Engineer',     position: 'DevOps Engineer',   score: 34, scoreClass: 'low',  status: 'rejected',    statusLabel: 'Tự động loại' },
  { initials: 'VT', name: 'Vũ Thu Trang',  role: 'Frontend Dev',        position: 'Frontend Engineer', score: 93, scoreClass: 'high', status: 'hired',       statusLabel: 'Đã tuyển' },
]

const AGENT_FEED = [
  {
    iconColor: 'teal',
    icon: 'ti-robot',
    text: <><b>Screening Agent</b> đã chấm điểm 14 hồ sơ mới cho vị trí Backend Engineer</>,
    time: '2 phút trước',
  },
  {
    iconColor: 'indigo',
    icon: 'ti-message-chatbot',
    text: <><b>Interview Agent</b> hoàn tất phỏng vấn tự động với Nguyễn Hoàng</>,
    time: '18 phút trước',
  },
  {
    iconColor: 'amber',
    icon: 'ti-alert-circle',
    text: <><b>Scheduling Agent</b> cần bạn xác nhận 3 khung giờ phỏng vấn</>,
    time: '42 phút trước',
  },
  {
    iconColor: 'teal',
    icon: 'ti-robot',
    text: <><b>Screening Agent</b> tự động loại 6 hồ sơ không đạt yêu cầu tối thiểu</>,
    time: '1 giờ trước',
  },
]

const INTERVIEWS = [
  { time: '09:30', name: 'Trần Lan Anh',  meta: 'UI/UX Designer · Vòng 2 (Hiring Manager)' },
  { time: '14:00', name: 'Đỗ Gia Bảo',   meta: 'Backend Engineer · Vòng kỹ thuật' },
  { time: '16:30', name: 'Hoàng Yến Nhi', meta: 'Data Analyst · Vòng cuối' },
]

function getGreeting(): string {
  const h = new Date().getHours()
  if (h < 12) return 'Chào buổi sáng'
  if (h < 18) return 'Chào buổi chiều'
  return 'Chào buổi tối'
}

function getFirstName(fullName: string): string {
  const parts = fullName.trim().split(' ')
  return parts[parts.length - 1]
}

function formatToday(): string {
  const d = new Date()
  return `${d.getDate()} tháng ${d.getMonth() + 1}`
}

export default function RecruiterDashboardPage() {
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const firstName = user ? getFirstName(user.fullName) : 'bạn'

  return (
    <DashboardLayout
      actions={
        <button className="rd-btn-primary" onClick={() => navigate('/recruiter/jobs/create')}>
          <i className="ti ti-plus" />
          Tạo tin tuyển dụng
        </button>
      }
    >
      {/* ── Page header ── */}
      <div className="rd-page-head">
        <div>
          <h1>{getGreeting()}, {firstName}</h1>
          <p>Đây là tổng quan hoạt động tuyển dụng của bạn hôm nay, {formatToday()}</p>
        </div>
        <div className="rd-range-pill">7 ngày qua ▾</div>
      </div>

      {/* ── Metric cards ── */}
      <div className="rd-metrics">
        {METRICS.map((m) => (
          <div key={m.label} className="rd-metric-card">
            <div className="rd-metric-top">
              <span className="rd-metric-label">{m.label}</span>
              <span className={`rd-metric-icon ${m.iconColor}`}>
                <i className={`ti ${m.icon}`} />
              </span>
            </div>
            <div className="rd-metric-value">{m.value}</div>
            <div className={`rd-metric-delta ${m.deltaType}`}>{m.delta}</div>
          </div>
        ))}
      </div>

      {/* ── 2-column grid ── */}
      <div className="rd-grid">
        {/* Left column */}
        <div>
          {/* Pipeline panel */}
          <div className="rd-panel">
            <div className="rd-panel-head">
              <h2>Pipeline ứng viên</h2>
              <button className="rd-panel-link">Xem chi tiết</button>
            </div>
            {PIPELINE.map((row) => (
              <div key={row.label} className="rd-funnel-row">
                <span className="rd-funnel-label">{row.label}</span>
                <div className="rd-funnel-track">
                  <div
                    className="rd-funnel-fill"
                    style={{ width: `${row.pct}%`, background: row.color }}
                  />
                </div>
                <span className="rd-funnel-count">{row.count}</span>
              </div>
            ))}
          </div>

          {/* Recent applications panel */}
          <div className="rd-panel">
            <div className="rd-panel-head">
              <h2>Hồ sơ gần đây</h2>
              <button className="rd-panel-link">Xem tất cả</button>
            </div>
            <table className="rd-apps-table">
              <thead>
                <tr>
                  <th>Ứng viên</th>
                  <th>Vị trí</th>
                  <th>Điểm match</th>
                  <th>Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {APPLICATIONS.map((app) => (
                  <tr key={app.name}>
                    <td>
                      <div className="rd-cand-cell">
                        <div className="rd-cand-avatar">{app.initials}</div>
                        <div>
                          <div className="rd-cand-name">{app.name}</div>
                          <div className="rd-cand-role">{app.role}</div>
                        </div>
                      </div>
                    </td>
                    <td>{app.position}</td>
                    <td>
                      <span className={`rd-score-pill rd-score-${app.scoreClass}`}>
                        {app.score}
                      </span>
                    </td>
                    <td>
                      <span className={`badge badge-${app.status}`}>{app.statusLabel}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right column */}
        <div>
          {/* Agent activity panel */}
          <div className="rd-panel">
            <div className="rd-panel-head">
              <h2>Hoạt động AI Agent</h2>
              <button className="rd-panel-link">Nhật ký</button>
            </div>
            {AGENT_FEED.map((item, i) => (
              <div key={i} className="rd-feed-item">
                <div className={`rd-feed-icon ${item.iconColor}`}>
                  <i className={`ti ${item.icon}`} />
                </div>
                <div>
                  <div className="rd-feed-text">{item.text}</div>
                  <div className="rd-feed-time">{item.time}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Today's interviews panel */}
          <div className="rd-panel">
            <div className="rd-panel-head">
              <h2>Lịch phỏng vấn hôm nay</h2>
              <button className="rd-panel-link">Xem lịch</button>
            </div>
            {INTERVIEWS.map((iv) => (
              <div key={iv.time} className="rd-interview-item">
                <div className="rd-interview-time">
                  <div className="rd-time-value">{iv.time}</div>
                  <div className="rd-time-label">Hôm nay</div>
                </div>
                <div>
                  <div className="rd-interview-name">{iv.name}</div>
                  <div className="rd-interview-meta">{iv.meta}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
