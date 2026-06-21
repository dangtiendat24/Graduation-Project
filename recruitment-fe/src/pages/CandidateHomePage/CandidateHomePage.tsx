import { useNavigate } from 'react-router-dom'
import CandidateLayout from '../../layouts/CandidateLayout/CandidateLayout'
import { useAuthStore } from '../../store/authStore'
import './CandidateHomePage.css'

/* ── Static data ── */
const METRICS = [
  { label: 'Đơn đã nộp',       value: 6, sub: 'Trong 30 ngày qua',    icon: 'ti-send',        color: 'indigo' },
  { label: 'Cần hành động',    value: 1, sub: 'Chọn lịch phỏng vấn', icon: 'ti-alert-circle', color: 'amber'  },
  { label: 'Đã phỏng vấn AI',  value: 2, sub: 'Đang chờ kết quả',    icon: 'ti-robot',        color: 'violet' },
  { label: 'Lời mời nhận việc',value: 0, sub: 'Chưa có lời mời nào', icon: 'ti-user-check',   color: 'green'  },
]

const APPLICATIONS = [
  { initials: 'TC', title: 'Senior Backend Engineer', company: 'TechCorp Vietnam', status: 'schedule',    label: 'Chờ chọn lịch'    },
  { initials: 'FN', title: 'Product Designer',        company: 'Fintek Solutions',  status: 'interviewed', label: 'Đã phỏng vấn AI'  },
  { initials: 'DV', title: 'Data Analyst',            company: 'DataViet Group',   status: 'matched',     label: 'Đã chấm điểm'     },
  { initials: 'VX', title: 'Frontend Developer',      company: 'Vexa Studio',      status: 'scheduled',   label: 'Đã xác nhận lịch' },
]

const REC_JOBS = [
  { initials: 'NX', title: 'DevOps Engineer',    company: 'Nexlify Cloud', location: 'Remote',   match: 85 },
  { initials: 'QT', title: 'Backend Developer',  company: 'Quantix Labs',  location: 'Quận 1',   match: 79 },
  { initials: 'SH', title: 'Mobile Developer',   company: 'Shoply Tech',   location: 'Quận 7',   match: 74 },
]

const NOTIFICATIONS = [
  {
    color: 'amber', icon: 'ti-alert-circle',
    text: <><b>TechCorp Vietnam</b> mời bạn chọn lịch phỏng vấn vòng 2</>,
    time: '2 giờ trước',
  },
  {
    color: 'indigo', icon: 'ti-robot',
    text: <>Kết quả phỏng vấn AI cho <b>Product Designer</b> đã sẵn sàng</>,
    time: 'Hôm qua',
  },
  {
    color: 'teal', icon: 'ti-robot',
    text: <>Hồ sơ của bạn vừa được AI chấm điểm cho <b>Data Analyst</b></>,
    time: '2 ngày trước',
  },
]

const PROFILE_PCT = 72

function getFirstName(fullName: string): string {
  const parts = fullName.trim().split(' ')
  return parts[parts.length - 1]
}

export default function CandidateHomePage() {
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const firstName = user ? getFirstName(user.fullName) : 'bạn'

  return (
    <CandidateLayout>
      {/* ── Welcome banner ── */}
      <div className="ch-welcome">
        <div className="ch-welcome-inner">
          <div>
            <h1>Chào mừng trở lại, {firstName}</h1>
            <p>Bạn có 1 lời mời phỏng vấn mới và 3 đơn đang chờ phản hồi</p>
          </div>

          <div className="ch-profile-ring">
            <div
              className="ch-ring"
              style={{
                background: `conic-gradient(var(--color-teal-light) 0% ${PROFILE_PCT}%, rgba(255,255,255,0.12) ${PROFILE_PCT}% 100%)`,
              }}
            >
              <div className="ch-ring-inner">{PROFILE_PCT}%</div>
            </div>
            <div className="ch-ring-txt">
              <p>Hồ sơ hoàn thiện {PROFILE_PCT}%</p>
              <span>Bổ sung để tăng độ phù hợp AI</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Main content ── */}
      <div className="ch-content">
        {/* Metric cards */}
        <div className="ch-metrics">
          {METRICS.map((m) => (
            <div key={m.label} className="ch-metric-card">
              <div className="ch-metric-top">
                <span className="ch-metric-label">{m.label}</span>
                <span className={`ch-metric-icon ${m.color}`}>
                  <i className={`ti ${m.icon}`} />
                </span>
              </div>
              <div className="ch-metric-value">{m.value}</div>
              <div className="ch-metric-sub">{m.sub}</div>
            </div>
          ))}
        </div>

        {/* 2-col grid */}
        <div className="ch-grid">
          {/* Left column */}
          <div>
            {/* Recent applications */}
            <div className="ch-panel">
              <div className="ch-panel-head">
                <h2>Hồ sơ ứng tuyển gần đây</h2>
                <button
                  className="ch-panel-link"
                  onClick={() => navigate('/candidate/applications')}
                >
                  Xem tất cả
                </button>
              </div>
              {APPLICATIONS.map((app) => (
                <div key={app.title} className="ch-app-item">
                  <div className="ch-app-logo">{app.initials}</div>
                  <div className="ch-app-info">
                    <div className="ch-app-title">{app.title}</div>
                    <div className="ch-app-co">{app.company}</div>
                  </div>
                  <span className={`badge badge-${app.status}`}>{app.label}</span>
                </div>
              ))}
            </div>

            {/* Recommended jobs */}
            <div className="ch-panel">
              <div className="ch-panel-head">
                <h2>Việc làm gợi ý cho bạn</h2>
                <button
                  className="ch-panel-link"
                  onClick={() => navigate('/candidate/jobs')}
                >
                  Xem tất cả
                </button>
              </div>
              {REC_JOBS.map((job) => (
                <div key={job.title} className="ch-rec-item">
                  <div className="ch-rec-logo">{job.initials}</div>
                  <div className="ch-rec-info">
                    <div className="ch-rec-title">{job.title}</div>
                    <div className="ch-rec-co">{job.company} · {job.location}</div>
                  </div>
                  <span className="ch-rec-match">{job.match}%</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right column */}
          <div>
            {/* Notifications */}
            <div className="ch-panel">
              <div className="ch-panel-head">
                <h2>Thông báo</h2>
                <button className="ch-panel-link">Tất cả</button>
              </div>
              {NOTIFICATIONS.map((n, i) => (
                <div key={i} className="ch-notif-item">
                  <div className={`ch-notif-icon ${n.color}`}>
                    <i className={`ti ${n.icon}`} />
                  </div>
                  <div>
                    <div className="ch-notif-text">{n.text}</div>
                    <div className="ch-notif-time">{n.time}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Profile completeness */}
            <div className="ch-panel">
              <div className="ch-panel-head">
                <h2>Hoàn thiện hồ sơ</h2>
              </div>
              <div className="ch-profile-progress">
                <div className="ch-pp-top">
                  <span>Tiến độ hồ sơ</span>
                  <b>{PROFILE_PCT}%</b>
                </div>
                <div className="ch-pp-track">
                  <div className="ch-pp-fill" style={{ width: `${PROFILE_PCT}%` }} />
                </div>
                <div className="ch-pp-hint">
                  Thêm chứng chỉ và portfolio để tăng độ phù hợp khi AI chấm điểm
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </CandidateLayout>
  )
}
