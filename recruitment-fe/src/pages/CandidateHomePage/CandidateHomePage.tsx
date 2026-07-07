import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import CandidateLayout from '../../layouts/CandidateLayout/CandidateLayout'
import { getMyApplications, getMyApplicationDetail } from '../../api/candidateApplications'
import type { ApplicationStatus } from '../../api/applications'
import './CandidateHomePage.css'

const STATUS_LABELS: Record<ApplicationStatus, string> = {
  pending: 'Đã nộp đơn',
  matched: 'Hồ sơ phù hợp',
  interviewed: 'Đã phỏng vấn AI',
  schedule_sent: 'Đang chờ xác nhận lịch',
  scheduled: 'Đã xác nhận lịch',
  completed: 'Đã hoàn thành phỏng vấn',
  hired: 'Được tuyển dụng',
  rejected: 'Không phù hợp',
}

const SCORE_CLASS: Record<string, string> = {
  strong_match: 'sp-strong',
  good_match: 'sp-good',
  partial_match: 'sp-part',
  poor_match: 'sp-poor',
}

/* 6 bước pipeline — index khớp trực tiếp với application.status theo thứ tự tiến trình */
const PIPE_STEP_LABELS = [
  { label: 'Nộp đơn', icon: 'ti-send' },
  { label: 'AI Matching', icon: 'ti-sparkles' },
  { label: 'Phỏng vấn AI', icon: 'ti-message-chatbot' },
  { label: 'Xác nhận\nlịch HV', icon: 'ti-calendar-check' },
  { label: 'Phỏng vấn\nchính thức', icon: 'ti-calendar-event' },
  { label: 'Kết quả', icon: 'ti-trophy' },
]

const STATUS_STEP_INDEX: Record<ApplicationStatus, number> = {
  pending: 0,
  matched: 1,
  interviewed: 2,
  schedule_sent: 3,
  scheduled: 4,
  completed: 5,
  hired: 5,
  rejected: 5,
}

/* Đơn "đang chạy" — không phải hired/rejected — dùng để chọn đơn nổi bật cho pipeline tracker */
const ACTIVE_PIPELINE_STATUSES: ApplicationStatus[] = [
  'pending',
  'matched',
  'interviewed',
  'schedule_sent',
  'scheduled',
  'completed',
]

const IN_PROGRESS_STATUSES: ApplicationStatus[] = [
  'pending',
  'matched',
  'interviewed',
  'schedule_sent',
  'scheduled',
]

const INTERVIEW_STATUSES: ApplicationStatus[] = ['interviewed', 'schedule_sent', 'scheduled', 'completed']

const COMPANY_GRADIENTS: [string, string][] = [
  ['#0D9488', '#4338CA'],
  ['#7C3AED', '#1E1065'],
  ['#D97706', '#EF4444'],
  ['#0369A1', '#0D9488'],
  ['#16A34A', '#0D9488'],
]

function companyGradient(seed: string): [string, string] {
  let hash = 0
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0
  return COMPANY_GRADIENTS[hash % COMPANY_GRADIENTS.length]
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
}

function formatDateTime(iso: string): string {
  const d = new Date(iso)
  return `${formatDate(iso)} · ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

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
  const [detailId, setDetailId] = useState<string | null>(null)

  const { data, isLoading, isError } = useQuery({
    queryKey: ['candidate-applications', 'dashboard'],
    queryFn: () => getMyApplications({ limit: 100 }),
  })

  const applications = data?.data ?? []
  const totalApplications = data?.meta.total ?? 0
  const inProgressCount = applications.filter((a) => IN_PROGRESS_STATUSES.includes(a.status)).length
  const interviewCount = applications.filter((a) => INTERVIEW_STATUSES.includes(a.status)).length

  // Đơn nổi bật cho pipeline tracker: đơn active gần nhất (data đã sort DESC theo appliedAt)
  const activeApplication = applications.find((a) => ACTIVE_PIPELINE_STATUSES.includes(a.status)) ?? null

  const detailQuery = useQuery({
    queryKey: ['candidate-applications', 'detail', detailId],
    queryFn: () => getMyApplicationDetail(detailId as string),
    enabled: detailId !== null,
  })

  const heroStats = [
    { num: totalApplications, numClass: 'teal', label: 'Đơn đã nộp' },
    { num: inProgressCount, numClass: 'amber', label: 'Đang xử lý' },
    { num: interviewCount, numClass: 'violet', label: 'Phỏng vấn' },
  ]

  return (
    <CandidateLayout>

      {/* ── Hero banner ── */}
      <div className="ch-hero">
        <div className="ch-hero-left">
          <h1 className="ch-hero-title">
            {activeApplication?.status === 'schedule_sent' ? (
              <>Bạn có <span>1 buổi phỏng vấn</span><br />đang chờ xác nhận!</>
            ) : (
              <>Theo dõi <span>tiến trình ứng tuyển</span><br />của bạn</>
            )}
          </h1>
          <p className="ch-hero-sub">
            {totalApplications > 0
              ? `Bạn đã nộp ${totalApplications} đơn ứng tuyển. Theo dõi tiến trình bên dưới.`
              : 'Bạn chưa nộp đơn ứng tuyển nào. Hãy bắt đầu tìm việc phù hợp!'}
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
          {heroStats.map((s) => (
            <div key={s.label} className="ch-hero-stat">
              <div className={`ch-hs-num ch-hs-${s.numClass}`}>{s.num}</div>
              <div className="ch-hs-lbl">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Pipeline của đơn nổi bật ── */}
      {activeApplication && (
        <div>
          <div className="ch-sec-header">
            <div className="ch-sec-title"><i className="ti ti-route" /> Tiến trình đơn nổi bật</div>
          </div>
          <div className="ch-card">
            <div className="ch-pipeline-wrap">
              <div className="ch-pipeline-meta">
                <strong>{activeApplication.job.title}</strong> · {activeApplication.job.company?.name ?? 'N/A'}
                <span className="ch-badge-amber-sm">{STATUS_LABELS[activeApplication.status]}</span>
              </div>
              <div className="ch-pipeline">
                {PIPE_STEP_LABELS.map((step, i) => {
                  const currentIdx = STATUS_STEP_INDEX[activeApplication.status]
                  const state = i < currentIdx ? 'done' : i === currentIdx ? 'active' : 'wait'
                  const lines = step.label.split('\n')
                  return (
                    <div key={i} className={`ch-pipe-step ch-ps-${state}`}>
                      <div className="ch-pipe-dot">
                        <i className={`ti ${state === 'done' ? 'ti-check' : step.icon}`} />
                      </div>
                      <div className="ch-pipe-lbl">
                        {lines.map((line, j) => (
                          <span key={j}>{line}{j < lines.length - 1 && <br />}</span>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
            {activeApplication.status === 'schedule_sent' && (
              <div className="ch-pipeline-alert">
                <div className="ch-pa-text">
                  <i className="ti ti-alert-triangle" />
                  Bạn có lịch phỏng vấn chờ xác nhận!
                </div>
                <button className="ch-pa-btn" onClick={() => navigate('/candidate/schedule')}>
                  <i className="ti ti-calendar-check" /> Xác nhận ngay
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── 2-column layout ── */}
      <div className="ch-two-col">

        {/* LEFT column */}
        <div>
          {/* Applications table */}
          <div className="ch-sec-header">
            <div className="ch-sec-title"><i className="ti ti-list-check" /> Đơn ứng tuyển của tôi</div>
          </div>
          <div className="ch-card">
            {isLoading ? (
              <div className="ch-empty-state">Đang tải danh sách đơn ứng tuyển...</div>
            ) : isError ? (
              <div className="ch-empty-state">Không thể tải danh sách đơn ứng tuyển. Vui lòng thử lại.</div>
            ) : applications.length === 0 ? (
              <div className="ch-empty-state">Bạn chưa nộp đơn ứng tuyển nào.</div>
            ) : (
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
                  {applications.map((app) => {
                    const companyName = app.job.company?.name ?? '—'
                    const [gradFrom, gradTo] = companyGradient(companyName || app.job.title)
                    return (
                      <tr key={app.applicationId}>
                        <td>
                          <div className="ch-job-title">{app.job.title}</div>
                          <div className="ch-job-co">
                            {app.job.company?.logoUrl ? (
                              <img src={app.job.company.logoUrl} className="ch-co-logo" alt="" />
                            ) : (
                              <span
                                className="ch-co-logo"
                                style={{ background: `linear-gradient(135deg, ${gradFrom}, ${gradTo})` }}
                              />
                            )}
                            {companyName}
                          </div>
                        </td>
                        <td>
                          {app.matching?.overallScore != null ? (
                            <span
                              className={`ch-score-pill ${
                                SCORE_CLASS[app.matching.recommendation ?? ''] ?? 'sp-part'
                              }`}
                            >
                              {app.matching.overallScore}
                            </span>
                          ) : (
                            <span className="ch-score-pending">Đang xử lý…</span>
                          )}
                        </td>
                        <td>
                          <span className={`ch-badge bd-${app.status}`}>{STATUS_LABELS[app.status]}</span>
                          {app.autoRejected && <div className="ch-auto-rejected-note">Từ chối tự động</div>}
                        </td>
                        <td className="ch-td-date">{formatDate(app.appliedAt)}</td>
                        <td>
                          <button className="ch-btn-row" onClick={() => setDetailId(app.applicationId)}>
                            <i className="ti ti-eye" /> Xem chi tiết
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
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

      {/* ── Application detail modal ── */}
      {detailId && (
        <div className="ch-overlay" onClick={() => setDetailId(null)}>
          <div className="ch-detail-modal" onClick={(e) => e.stopPropagation()}>
            {detailQuery.isLoading ? (
              <div className="ch-empty-state">Đang tải chi tiết đơn ứng tuyển...</div>
            ) : detailQuery.isError || !detailQuery.data ? (
              <div className="ch-empty-state">Không tải được chi tiết đơn ứng tuyển.</div>
            ) : (
              <>
                <h3 className="ch-detail-title">{detailQuery.data.job.title}</h3>
                <p className="ch-detail-sub">{detailQuery.data.job.company?.name ?? 'N/A'}</p>
                <div className="ch-detail-status">
                  <span className={`ch-badge bd-${detailQuery.data.status}`}>
                    {STATUS_LABELS[detailQuery.data.status]}
                  </span>
                  {detailQuery.data.autoRejected && (
                    <span className="ch-auto-rejected-note" style={{ marginLeft: 8, display: 'inline-block' }}>
                      Hồ sơ bị từ chối tự động do điểm matching thấp
                    </span>
                  )}
                </div>
                <div className="ch-timeline">
                  {detailQuery.data.statusHistory.map((h, i) => (
                    <div key={i} className="ch-timeline-item">
                      <div className="ch-timeline-rail">
                        <div className="ch-timeline-dot" />
                        {i < detailQuery.data.statusHistory.length - 1 && <div className="ch-timeline-line" />}
                      </div>
                      <div className="ch-timeline-content">
                        <div className="ch-timeline-label">{h.label}</div>
                        <div className="ch-timeline-date">{formatDateTime(h.changedAt)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
            <button className="ch-detail-close-btn" onClick={() => setDetailId(null)}>Đóng</button>
          </div>
        </div>
      )}

    </CandidateLayout>
  )
}
