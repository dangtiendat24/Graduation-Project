import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import CandidateLayout from '../../layouts/CandidateLayout/CandidateLayout'
import { getMyApplications, type MyApplicationListItem } from '../../api/candidateApplications'
import type { ApplicationStatus } from '../../api/applications'
import { getMyProfile, calcCompletionPct, calcCompletionItems } from '../../api/profile'
import { getActiveJobs } from '../../api/jobs'
import ApplicationDetailModal from '../../components/ApplicationDetailModal/ApplicationDetailModal'
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

const WEEKDAY_SHORT = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7']

function formatInterviewSlot(startIso: string, endIso: string | null) {
  const start = new Date(startIso)
  const timeFmt = (d: Date) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  const timeLabel = endIso
    ? `${timeFmt(start)} – ${timeFmt(new Date(endIso))} (+07)`
    : `${timeFmt(start)} (+07)`
  return {
    day: WEEKDAY_SHORT[start.getDay()],
    date: String(start.getDate()).padStart(2, '0'),
    month: `Th${start.getMonth() + 1}`,
    timeLabel,
  }
}

function daysAgoLabel(iso: string): string {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24))
  if (days <= 0) return 'Hôm nay'
  if (days === 1) return '1 ngày trước'
  return `${days} ngày trước`
}

/** 5 bước pipeline ứng với 5 AI Agent — suy ra state (done/active/wait) từ dữ liệu thật của đơn nổi bật */
function buildAiSteps(app: MyApplicationListItem) {
  const cvParsed = app.matching !== null || app.status !== 'pending'
  const matched = app.matching !== null
  const interviewDone = app.interview?.status === 'completed'
  const interviewActive = !interviewDone && (app.interview !== null || app.status === 'matched')
  const scheduleDone = app.schedule?.status === 'confirmed'
  const scheduleActive = !scheduleDone && (app.schedule !== null || app.status === 'schedule_sent')
  const reportDone = ['completed', 'hired'].includes(app.status)

  const stepOf = (done: boolean, active: boolean, doneLabel: string, activeLabel: string, waitLabel: string) =>
    done
      ? { state: 'done' as const, icon: 'ti-check', label: doneLabel }
      : active
        ? { state: 'active' as const, icon: 'ti-loader-2', label: activeLabel }
        : { state: 'wait' as const, icon: 'ti-circle', label: waitLabel }

  return [
    stepOf(cvParsed, !cvParsed, 'Agent 1: Phân tích CV', 'Agent 1: Đang phân tích CV…', 'Agent 1: Phân tích CV'),
    stepOf(matched, cvParsed && !matched, 'Agent 2: Matching JD', 'Agent 2: Matching JD… (đang chạy)', 'Agent 2: Matching JD'),
    stepOf(interviewDone, interviewActive, 'Agent 3: Phỏng vấn AI', 'Agent 3: Phỏng vấn AI (đang chờ/đang chấm)', 'Agent 3: Phỏng vấn AI'),
    stepOf(scheduleDone, scheduleActive, 'Agent 4: Lên lịch', 'Agent 4: Lên lịch (đang chờ xác nhận)', 'Agent 4: Lên lịch'),
    stepOf(reportDone, scheduleDone && !reportDone, 'Agent 5: Báo cáo', 'Agent 5: Báo cáo (đang tổng hợp)', 'Agent 5: Báo cáo'),
  ]
}

export default function CandidateHomePage() {
  const navigate = useNavigate()
  const [detailId, setDetailId] = useState<string | null>(null)

  const { data, isLoading, isError } = useQuery({
    queryKey: ['candidate-applications', 'dashboard'],
    queryFn: () => getMyApplications({ limit: 100 }),
  })

  const { data: profile } = useQuery({
    queryKey: ['profile', 'me'],
    queryFn: getMyProfile,
    staleTime: 30_000,
  })

  const { data: activeJobs } = useQuery({
    queryKey: ['jobs', 'active'],
    queryFn: () => getActiveJobs(),
    staleTime: 30_000,
  })

  const applications = data?.data ?? []
  const totalApplications = data?.meta.total ?? 0
  const inProgressCount = applications.filter((a) => IN_PROGRESS_STATUSES.includes(a.status)).length
  const interviewCount = applications.filter((a) => INTERVIEW_STATUSES.includes(a.status)).length

  // Đơn nổi bật cho pipeline tracker: đơn active gần nhất (data đã sort DESC theo appliedAt)
  const activeApplication = applications.find((a) => ACTIVE_PIPELINE_STATUSES.includes(a.status)) ?? null

  const heroStats = [
    { num: totalApplications, numClass: 'teal', label: 'Đơn đã nộp' },
    { num: inProgressCount, numClass: 'amber', label: 'Đang xử lý' },
    { num: interviewCount, numClass: 'violet', label: 'Phỏng vấn' },
  ]

  // Phỏng vấn sắp tới: ưu tiên lịch đang chờ ứng viên chọn khung giờ (cần hành động ngay),
  // nếu không có thì lấy lịch đã xác nhận gần nhất còn nằm trong tương lai
  const nowMs = new Date().getTime()
  const pendingScheduleApp = applications.find((a) => a.schedule?.status === 'pending') ?? null
  const confirmedUpcomingApp = applications
    .filter((a) => a.schedule?.status === 'confirmed' && a.schedule.confirmedStartTime)
    .filter((a) => new Date(a.schedule!.confirmedStartTime!).getTime() >= nowMs)
    .sort((a, b) => new Date(a.schedule!.confirmedStartTime!).getTime() - new Date(b.schedule!.confirmedStartTime!).getTime())[0]
    ?? null
  const upcomingInterview = pendingScheduleApp ?? confirmedUpcomingApp

  // Phân tích kỹ năng: kỹ năng CV đã phân tích vs kỹ năng các JD đã ứng tuyển yêu cầu
  const skillsHave = profile?.resume?.parsedSkills ?? []
  const skillsHaveLower = new Set(skillsHave.map((s) => s.toLowerCase()))
  const requiredSkillsPool = new Map<string, string>()
  applications.forEach((a) => a.job.requiredSkills?.forEach((s) => requiredSkillsPool.set(s.toLowerCase(), s)))
  const skillsMissing = [...requiredSkillsPool.entries()]
    .filter(([lower]) => !skillsHaveLower.has(lower))
    .map(([, original]) => original)
  const appliedJobCount = applications.filter((a) => a.job.requiredSkills && a.job.requiredSkills.length > 0).length

  // Hồ sơ của bạn: % hoàn thiện + các mục còn thiếu, dùng đúng logic đã có ở trang Hồ sơ cá nhân
  const completionPct = profile ? calcCompletionPct(profile) : 0
  const completionMissing = profile ? calcCompletionItems(profile).filter((i) => !i.done) : []

  // Gợi ý việc làm: job đang tuyển, chưa ứng tuyển, ưu tiên khớp nhiều kỹ năng CV nhất rồi mới đến job mới nhất
  const appliedJobIds = new Set(applications.map((a) => a.job.id))
  const recommendedJobs = (activeJobs ?? [])
    .filter((j) => !appliedJobIds.has(j.id))
    .map((j) => ({
      job: j,
      matchedSkills: (j.requiredSkills ?? []).filter((s) => skillsHaveLower.has(s.toLowerCase())),
    }))
    .sort((a, b) => {
      if (b.matchedSkills.length !== a.matchedSkills.length) return b.matchedSkills.length - a.matchedSkills.length
      return new Date(b.job.createdAt).getTime() - new Date(a.job.createdAt).getTime()
    })
    .slice(0, 3)

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
              <div className="ch-sec-title"><i className="ti ti-sparkles" /> Gợi ý việc làm</div>
              <div className="ch-sec-link" onClick={() => navigate('/candidate/jobs')}>
                Xem thêm <i className="ti ti-arrow-right" />
              </div>
            </div>
            <div className="ch-card">
              {recommendedJobs.length === 0 ? (
                <div className="ch-empty-state">
                  {activeJobs === undefined
                    ? 'Đang tải gợi ý việc làm...'
                    : 'Chưa có việc làm mới phù hợp. Hãy khám phá thêm ở trang Việc làm.'}
                </div>
              ) : (
                recommendedJobs.map(({ job, matchedSkills }) => {
                  const companyName = job.company?.name ?? job.title
                  const [gradFrom, gradTo] = companyGradient(companyName)
                  const modeLabel = job.workModel === 'onsite' ? 'Onsite' : job.workModel === 'hybrid' ? 'Hybrid' : job.workModel === 'remote' ? 'Remote' : null
                  return (
                    <div key={job.id} className="ch-job-card">
                      {job.company?.logoUrl ? (
                        <img src={job.company.logoUrl} className="ch-jc-logo" alt="" />
                      ) : (
                        <div className="ch-jc-logo" style={{ background: `linear-gradient(135deg, ${gradFrom}, ${gradTo})` }}>
                          {companyName.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="ch-jc-info">
                        <div className="ch-jc-title">{job.title}</div>
                        <div className="ch-jc-co">{job.company?.name ?? 'N/A'} · {job.location ?? 'N/A'}</div>
                        <div className="ch-jc-tags">
                          <span className="ch-tag ch-tag-salary">{job.salaryRange ?? 'Thoả thuận'}</span>
                          {modeLabel && (
                            <span className="ch-tag ch-tag-mode">
                              {modeLabel === 'Remote' && <i className="ti ti-home" />} {modeLabel}
                            </span>
                          )}
                          {matchedSkills.length > 0 && (
                            <span className="ch-tag ch-tag-match">
                              <i className="ti ti-sparkles" /> {matchedSkills.length}/{(job.requiredSkills ?? []).length} kỹ năng khớp
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="ch-jc-right">
                        <div className="ch-jc-date">{daysAgoLabel(job.createdAt)}</div>
                        <button className="ch-btn-apply" onClick={() => navigate(`/candidate/jobs/${job.id}`)}>Xem việc làm</button>
                      </div>
                    </div>
                  )
                })
              )}
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
              {!upcomingInterview ? (
                <div className="ch-empty-state">Bạn chưa có lịch phỏng vấn nào sắp tới.</div>
              ) : upcomingInterview.schedule?.status === 'pending' ? (
                <>
                  <div className="ch-iv-item">
                    <div className="ch-iv-sep" />
                    <div className="ch-iv-info">
                      <div className="ch-iv-name">{upcomingInterview.job.company?.name ?? upcomingInterview.job.title}</div>
                      <div className="ch-iv-co">{upcomingInterview.job.title}</div>
                      <div className="ch-iv-when">
                        <i className="ti ti-alert-triangle" /> Đang chờ bạn chọn khung giờ phỏng vấn
                      </div>
                    </div>
                  </div>
                  <button className="ch-rp-action-btn ch-rp-action-amber" onClick={() => navigate('/candidate/schedule')}>
                    <i className="ti ti-calendar-check" /> Chọn khung giờ ngay
                  </button>
                </>
              ) : (
                (() => {
                  const slot = formatInterviewSlot(
                    upcomingInterview.schedule!.confirmedStartTime!,
                    upcomingInterview.schedule!.confirmedEndTime,
                  )
                  return (
                    <>
                      <div className="ch-iv-item">
                        <div className="ch-iv-time">
                          <div className="ch-iv-day">{slot.day}</div>
                          <div className="ch-iv-date">{slot.date}</div>
                          <div className="ch-iv-month">{slot.month}</div>
                        </div>
                        <div className="ch-iv-sep" />
                        <div className="ch-iv-info">
                          <div className="ch-iv-name">{upcomingInterview.job.company?.name ?? upcomingInterview.job.title}</div>
                          <div className="ch-iv-co">{upcomingInterview.job.title}</div>
                          <div className="ch-iv-when">
                            <i className="ti ti-clock" /> {slot.timeLabel}
                          </div>
                          {upcomingInterview.schedule?.meetLink && (
                            <span className="ch-iv-badge"><i className="ti ti-video" /> Google Meet</span>
                          )}
                        </div>
                      </div>
                      <button className="ch-rp-action-btn ch-rp-action-amber" onClick={() => navigate('/candidate/schedule')}>
                        <i className="ti ti-calendar-event" /> Xem lịch phỏng vấn
                      </button>
                    </>
                  )
                })()
              )}
            </div>
          </div>

          {/* AI pipeline status */}
          <div className="ch-rp-card">
            <div className="ch-rp-head">
              <div className="ch-rp-icon ri-violet"><i className="ti ti-robot" /></div>
              <div className="ch-rp-title">Trạng thái AI Pipeline</div>
            </div>
            <div className="ch-rp-body">
              {!activeApplication ? (
                <div className="ch-empty-state">Chưa có đơn ứng tuyển nào đang xử lý.</div>
              ) : (
                <>
                  <div className="ch-rp-subtitle">
                    {activeApplication.job.title} · {activeApplication.job.company?.name ?? 'N/A'}
                  </div>
                  {buildAiSteps(activeApplication).map((s, i) => (
                    <div key={i} className={`ch-ai-step ch-ai-${s.state}`}>
                      <i className={`ti ${s.icon}`} />
                      <span>{s.label}</span>
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>

          {/* Skill analysis */}
          <div className="ch-rp-card">
            <div className="ch-rp-head">
              <div className="ch-rp-icon ri-teal"><i className="ti ti-chart-radar" /></div>
              <div className="ch-rp-title">Phân tích kỹ năng</div>
            </div>
            <div className="ch-rp-body">
              {skillsHave.length === 0 ? (
                <div className="ch-empty-state">Tải lên CV để AI phân tích kỹ năng của bạn.</div>
              ) : (
                <>
                  <div className="ch-rp-subtitle">
                    {appliedJobCount > 0 ? `Dựa trên ${appliedJobCount} JD bạn ứng tuyển:` : 'Kỹ năng trích xuất từ CV của bạn:'}
                  </div>
                  <div className="ch-skill-group-label">
                    <i className="ti ti-check ch-icon-teal" /> Kỹ năng bạn có
                  </div>
                  <div className="ch-skill-chips">
                    {skillsHave.map((s) => (
                      <span key={s} className="ch-chip ch-chip-have">{s}</span>
                    ))}
                  </div>
                  {skillsMissing.length > 0 && (
                    <>
                      <div className="ch-skill-group-label" style={{ marginTop: '12px' }}>
                        <i className="ti ti-alert-circle ch-icon-danger" /> Kỹ năng còn thiếu
                      </div>
                      <div className="ch-skill-chips">
                        {skillsMissing.map((s) => (
                          <span key={s} className="ch-chip ch-chip-miss">{s}</span>
                        ))}
                      </div>
                    </>
                  )}
                </>
              )}
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
                <span className="ch-profile-pct">{completionPct}%</span>
              </div>
              <div className="ch-profile-track">
                <div className="ch-profile-fill" style={{ width: `${completionPct}%` }} />
              </div>
              {completionMissing.length > 0 && (
                <>
                  <div className="ch-profile-missing-label">Còn thiếu:</div>
                  {completionMissing.map((item) => (
                    <div key={item.label} className="ch-profile-missing-item">
                      <i className={`ti ${item.icon} ch-icon-amber`} /> {item.label}
                    </div>
                  ))}
                </>
              )}
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
        <ApplicationDetailModal
          applicationId={detailId}
          onClose={() => setDetailId(null)}
        />
      )}

    </CandidateLayout>
  )
}
