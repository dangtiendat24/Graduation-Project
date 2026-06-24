import { useNavigate } from 'react-router-dom'
import CandidateLayout from '../../layouts/CandidateLayout/CandidateLayout'
import './CandidateHomePage.css'

/* ── Static data ── */
const HERO_STATS = [
  { num: 5,  numClass: 'teal',   label: 'Đơn đã nộp'  },
  { num: 2,  numClass: 'amber',  label: 'Đang xử lý'  },
  { num: 1,  numClass: 'violet', label: 'Phỏng vấn'   },
]

const PIPE_STEPS = [
  { state: 'done',   icon: 'ti-check',          label: 'Nộp đơn',                 sub: ''        },
  { state: 'done',   icon: 'ti-check',          label: 'AI Matching',              sub: '85/100'  },
  { state: 'done',   icon: 'ti-check',          label: 'Phỏng vấn AI',            sub: '78/100'  },
  { state: 'active', icon: 'ti-clock',          label: 'Xác nhận\nlịch HV',       sub: ''        },
  { state: 'wait',   icon: 'ti-calendar-event', label: 'Phỏng vấn\nchính thức',   sub: ''        },
  { state: 'wait',   icon: 'ti-trophy',         label: 'Kết quả',                 sub: ''        },
]

const APPLICATIONS = [
  {
    title: 'Senior Backend Developer',
    company: 'TechVision Vietnam',
    gradFrom: '#0D9488', gradTo: '#4338CA',
    score: 85, scoreClass: 'sp-strong',
    badge: 'bd-scheduled', badgeIcon: 'ti-calendar',     badgeLabel: 'Chọn lịch',
    date: '14/06/2026',
    action: { label: 'Xem', icon: 'ti-eye', disabled: false },
  },
  {
    title: 'Python Developer (AI/ML)',
    company: 'VNG Corporation',
    gradFrom: '#7C3AED', gradTo: '#1E1065',
    score: 72, scoreClass: 'sp-good',
    badge: 'bd-interview', badgeIcon: 'ti-microphone',   badgeLabel: 'Phỏng vấn AI',
    date: '10/06/2026',
    action: { label: 'Vào PV', icon: 'ti-message-chatbot', disabled: false },
  },
  {
    title: 'Full-stack Developer',
    company: 'FPT Software',
    gradFrom: '#D97706', gradTo: '#EF4444',
    score: 68, scoreClass: 'sp-good',
    badge: 'bd-matched', badgeIcon: 'ti-sparkles',       badgeLabel: 'Đã match',
    date: '05/06/2026',
    action: { label: 'Xem', icon: 'ti-eye', disabled: false },
  },
  {
    title: 'DevOps Engineer',
    company: 'Tiki',
    gradFrom: '#0369A1', gradTo: '#0D9488',
    score: 45, scoreClass: 'sp-part',
    badge: 'bd-rejected', badgeIcon: 'ti-x',             badgeLabel: 'Không phù hợp',
    date: '01/06/2026',
    action: { label: 'Đã đóng', icon: '', disabled: true },
  },
  {
    title: 'Node.js Backend',
    company: 'Shopee VN',
    gradFrom: '#16A34A', gradTo: '#0D9488',
    score: null, scoreClass: '',
    badge: 'bd-pending', badgeIcon: 'ti-loader',          badgeLabel: 'Chờ AI',
    date: '22/06/2026',
    action: { label: 'Xem', icon: 'ti-eye', disabled: false },
  },
]

const REC_JOBS = [
  {
    logo: 'M', gradFrom: '#7C3AED', gradTo: '#4338CA',
    title: 'Senior Node.js Developer', company: 'MoMo', location: 'Hà Nội',
    salary: '25–35 tr/tháng', mode: 'Hybrid', modeIcon: 'ti-home', match: 92, hot: true,
    posted: '2 ngày trước',
  },
  {
    logo: 'Z', gradFrom: '#0369A1', gradTo: '#0D9488',
    title: 'Backend Engineer (NestJS)', company: 'Zalo', location: 'TP. HCM',
    salary: '20–30 tr/tháng', mode: 'Onsite', modeIcon: '', match: 88, hot: false,
    posted: '3 ngày trước',
  },
  {
    logo: 'T', gradFrom: '#D97706', gradTo: '#EF4444',
    title: 'Tech Lead Backend', company: 'Timo Bank', location: 'Hà Nội',
    salary: '35–50 tr/tháng', mode: 'Remote', modeIcon: 'ti-home', match: 81, hot: false,
    posted: '5 ngày trước',
  },
]

const AI_STEPS = [
  { state: 'done',   icon: 'ti-check',    label: 'Agent 1: Phân tích CV'              },
  { state: 'active', icon: 'ti-loader-2', label: 'Agent 2: Matching JD… (đang chạy)' },
  { state: 'wait',   icon: 'ti-circle',   label: 'Agent 3: Phỏng vấn AI'             },
  { state: 'wait',   icon: 'ti-circle',   label: 'Agent 4: Lên lịch'                 },
  { state: 'wait',   icon: 'ti-circle',   label: 'Agent 5: Báo cáo'                  },
]

const SKILLS_HAVE = ['Node.js', 'PostgreSQL', 'Docker', 'REST API', 'NestJS']
const SKILLS_MISS = ['Kubernetes', 'GraphQL', 'Kafka']

const PROFILE_PCT = 85

export default function CandidateHomePage() {
  const navigate = useNavigate()

  return (
    <CandidateLayout>

      {/* ── Hero banner ── */}
      <div className="ch-hero">
        <div className="ch-hero-left">
          <h1 className="ch-hero-title">
            Bạn có <span>1 buổi phỏng vấn</span><br />đang chờ xác nhận!
          </h1>
          <p className="ch-hero-sub">
            Agent AI đã tìm thấy 5 vị trí phù hợp với hồ sơ của bạn tuần này.
          </p>
          <div className="ch-hero-btns">
            <button className="ch-btn-hero-primary" onClick={() => navigate('/candidate/schedule')}>
              <i className="ti ti-calendar" /> Xem lịch phỏng vấn
            </button>
            <button className="ch-btn-hero-ghost" onClick={() => navigate('/candidate/jobs')}>
              <i className="ti ti-eye" /> Xem gợi ý việc làm
            </button>
          </div>
        </div>
        <div className="ch-hero-stats">
          {HERO_STATS.map((s) => (
            <div key={s.label} className="ch-hero-stat">
              <div className={`ch-hs-num ch-hs-${s.numClass}`}>{s.num}</div>
              <div className="ch-hs-lbl">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Pipeline of featured application ── */}
      <div>
        <div className="ch-sec-header">
          <div className="ch-sec-title"><i className="ti ti-route" /> Tiến trình đơn nổi bật</div>
          <div className="ch-sec-link" onClick={() => navigate('/candidate/applications')}>
            Xem tất cả đơn <i className="ti ti-arrow-right" />
          </div>
        </div>
        <div className="ch-card">
          <div className="ch-pipeline-wrap">
            <div className="ch-pipeline-meta">
              <strong>Senior Backend Developer</strong> · TechVision Vietnam
              <span className="ch-badge-amber-sm">Đang chờ xác nhận lịch</span>
            </div>
            <div className="ch-pipeline">
              {PIPE_STEPS.map((step, i) => (
                <div key={i} className={`ch-pipe-step ch-ps-${step.state}`}>
                  <div className="ch-pipe-dot">
                    <i className={`ti ${step.icon}`} />
                  </div>
                  <div className="ch-pipe-lbl">
                    {step.label.split('\n').map((line, j) => (
                      <span key={j}>{line}{j < step.label.split('\n').length - 1 && <br />}</span>
                    ))}
                    {step.sub && <span className="ch-pipe-sub">{step.sub}</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="ch-pipeline-alert">
            <div className="ch-pa-text">
              <i className="ti ti-alert-triangle" />
              Recruiter đã gửi 3 slot lịch phỏng vấn. Vui lòng xác nhận trước{' '}
              <strong>25/06/2026</strong>.
            </div>
            <button className="ch-pa-btn" onClick={() => navigate('/candidate/schedule')}>
              <i className="ti ti-calendar-check" /> Chọn lịch ngay
            </button>
          </div>
        </div>
      </div>

      {/* ── 2-column layout ── */}
      <div className="ch-two-col">

        {/* LEFT column */}
        <div>
          {/* Applications table */}
          <div className="ch-sec-header">
            <div className="ch-sec-title"><i className="ti ti-list-check" /> Đơn ứng tuyển gần đây</div>
            <div className="ch-sec-link" onClick={() => navigate('/candidate/applications')}>
              Xem tất cả <i className="ti ti-arrow-right" />
            </div>
          </div>
          <div className="ch-card">
            <table className="ch-app-table">
              <thead>
                <tr>
                  <th>VỊ TRÍ</th>
                  <th>ĐIỂM AI</th>
                  <th>TRẠNG THÁI</th>
                  <th>NGÀY NỘP</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {APPLICATIONS.map((app, i) => (
                  <tr key={i}>
                    <td>
                      <div className="ch-job-title">{app.title}</div>
                      <div className="ch-job-co">
                        <span
                          className="ch-co-logo"
                          style={{ background: `linear-gradient(135deg, ${app.gradFrom}, ${app.gradTo})` }}
                        />
                        {app.company}
                      </div>
                    </td>
                    <td>
                      {app.score !== null
                        ? <span className={`ch-score-pill ${app.scoreClass}`}>{app.score}</span>
                        : <span className="ch-score-pending">Đang xử lý…</span>
                      }
                    </td>
                    <td>
                      <span className={`ch-badge ${app.badge}`}>
                        <i className={`ti ${app.badgeIcon}`} /> {app.badgeLabel}
                      </span>
                    </td>
                    <td className="ch-td-date">{app.date}</td>
                    <td>
                      <button
                        className={`ch-btn-row${app.action.disabled ? ' ch-btn-row-disabled' : ''}`}
                        disabled={app.action.disabled}
                      >
                        {app.action.icon && <i className={`ti ${app.action.icon}`} />}
                        {app.action.label}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Job recommendations */}
          <div style={{ marginTop: '18px' }}>
            <div className="ch-sec-header">
              <div className="ch-sec-title"><i className="ti ti-sparkles" /> Gợi ý phù hợp từ AI</div>
              <div className="ch-sec-link" onClick={() => navigate('/candidate/jobs')}>
                Xem thêm <i className="ti ti-arrow-right" />
              </div>
            </div>
            <div className="ch-card">
              {REC_JOBS.map((job, i) => (
                <div key={i} className="ch-job-card">
                  <div
                    className="ch-jc-logo"
                    style={{ background: `linear-gradient(135deg, ${job.gradFrom}, ${job.gradTo})` }}
                  >
                    {job.logo}
                  </div>
                  <div className="ch-jc-info">
                    <div className="ch-jc-title">{job.title}</div>
                    <div className="ch-jc-co">{job.company} · {job.location}</div>
                    <div className="ch-jc-tags">
                      <span className="ch-tag ch-tag-salary">{job.salary}</span>
                      <span className="ch-tag ch-tag-mode">
                        {job.modeIcon && <i className={`ti ${job.modeIcon}`} />} {job.mode}
                      </span>
                      <span className="ch-tag ch-tag-match">
                        <i className="ti ti-sparkles" /> {job.match}% phù hợp
                      </span>
                      {job.hot && (
                        <span className="ch-tag ch-tag-hot">
                          <i className="ti ti-flame" /> Hot
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="ch-jc-right">
                    <div className="ch-jc-date">{job.posted}</div>
                    <button className="ch-btn-apply">Ứng tuyển</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT column */}
        <div>

          {/* Upcoming interviews */}
          <div className="ch-rp-card">
            <div className="ch-rp-head">
              <div className="ch-rp-icon ri-amber"><i className="ti ti-calendar-event" /></div>
              <div className="ch-rp-title">Phỏng vấn sắp tới</div>
            </div>
            <div className="ch-rp-body">
              <div className="ch-iv-item">
                <div className="ch-iv-time">
                  <div className="ch-iv-day">T4</div>
                  <div className="ch-iv-date">25</div>
                  <div className="ch-iv-month">Th6</div>
                </div>
                <div className="ch-iv-sep" />
                <div className="ch-iv-info">
                  <div className="ch-iv-name">TechVision Vietnam</div>
                  <div className="ch-iv-co">Senior Backend Developer</div>
                  <div className="ch-iv-when">
                    <i className="ti ti-clock" /> 14:00 – 15:00 (+07)
                  </div>
                  <span className="ch-iv-badge"><i className="ti ti-video" /> Google Meet</span>
                </div>
              </div>
              <button
                className="ch-rp-action-btn ch-rp-action-amber"
                onClick={() => navigate('/candidate/schedule')}
              >
                <i className="ti ti-calendar-check" /> Xác nhận lịch ngay
              </button>
            </div>
          </div>

          {/* AI pipeline status */}
          <div className="ch-rp-card">
            <div className="ch-rp-head">
              <div className="ch-rp-icon ri-violet"><i className="ti ti-robot" /></div>
              <div className="ch-rp-title">Trạng thái AI Pipeline</div>
            </div>
            <div className="ch-rp-body">
              <div className="ch-rp-subtitle">Node.js Backend · Shopee VN</div>
              {AI_STEPS.map((s, i) => (
                <div key={i} className={`ch-ai-step ch-ai-${s.state}`}>
                  <i className={`ti ${s.icon}`} />
                  <span>{s.label}</span>
                </div>
              ))}
              <div className="ch-ai-eta">
                <i className="ti ti-clock" /> Kết quả dự kiến sau ~30 giây
              </div>
            </div>
          </div>

          {/* Skill analysis */}
          <div className="ch-rp-card">
            <div className="ch-rp-head">
              <div className="ch-rp-icon ri-teal"><i className="ti ti-chart-radar" /></div>
              <div className="ch-rp-title">Phân tích kỹ năng</div>
            </div>
            <div className="ch-rp-body">
              <div className="ch-rp-subtitle">Dựa trên 5 JD bạn ứng tuyển:</div>
              <div className="ch-skill-group-label">
                <i className="ti ti-check ch-icon-teal" /> Kỹ năng bạn có
              </div>
              <div className="ch-skill-chips">
                {SKILLS_HAVE.map((s) => (
                  <span key={s} className="ch-chip ch-chip-have">{s}</span>
                ))}
              </div>
              <div className="ch-skill-group-label" style={{ marginTop: '12px' }}>
                <i className="ti ti-alert-circle ch-icon-danger" /> Kỹ năng còn thiếu
              </div>
              <div className="ch-skill-chips">
                {SKILLS_MISS.map((s) => (
                  <span key={s} className="ch-chip ch-chip-miss">{s}</span>
                ))}
              </div>
            </div>
          </div>

          {/* Profile completeness */}
          <div className="ch-rp-card">
            <div className="ch-rp-head">
              <div className="ch-rp-icon ri-indigo"><i className="ti ti-user-check" /></div>
              <div className="ch-rp-title">Hồ sơ của bạn</div>
            </div>
            <div className="ch-rp-body">
              <div className="ch-profile-row">
                <span className="ch-profile-label">Mức độ hoàn thiện</span>
                <span className="ch-profile-pct">{PROFILE_PCT}%</span>
              </div>
              <div className="ch-profile-track">
                <div className="ch-profile-fill" style={{ width: `${PROFILE_PCT}%` }} />
              </div>
              <div className="ch-profile-missing-label">Còn thiếu:</div>
              <div className="ch-profile-missing-item">
                <i className="ti ti-map-pin ch-icon-amber" /> Thành phố
              </div>
              <div className="ch-profile-missing-item">
                <i className="ti ti-brand-github ch-icon-amber" /> GitHub / Portfolio
              </div>
              <button
                className="ch-profile-complete-btn"
                onClick={() => navigate('/candidate/profile')}
              >
                <i className="ti ti-edit" /> Hoàn thiện hồ sơ
              </button>
            </div>
          </div>

        </div>{/* end right */}
      </div>{/* end two-col */}

    </CandidateLayout>
  )
}
