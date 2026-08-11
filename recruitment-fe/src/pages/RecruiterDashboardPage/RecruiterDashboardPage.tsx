import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import DashboardLayout from '../../layouts/DashboardLayout/DashboardLayout'
import { useAuthStore } from '../../store/authStore'
import { getDashboardStats } from '../../api/dashboard'
import { getRecruiterCandidates, type ApplicationStatus } from '../../api/candidates'
import { getRecruiterSchedules } from '../../api/schedule'
import { getAgentStats, getAgentActivity, type AgentName } from '../../api/admin'
import { getScoreBand } from '../../api/rankings'
import './RecruiterDashboardPage.css'

const DAY_MS = 24 * 60 * 60 * 1000

const STATUS_LABELS: Record<ApplicationStatus, string> = {
  pending: 'Vừa nộp đơn',
  matched: 'Đã chấm điểm',
  interviewed: 'Đã phỏng vấn AI',
  schedule_sent: 'Chờ chọn lịch',
  scheduled: 'Đã hẹn lịch',
  completed: 'AI báo cáo',
  hired: 'Đã tuyển',
  rejected: 'Từ chối',
}

const AGENT_LABELS: Record<AgentName, string> = {
  agent1_resume_parser: 'Resume Parser Agent',
  agent2_matching: 'Matching Agent',
  agent3_interview: 'Interview Agent',
  agent4_scheduling: 'Scheduling Agent',
  agent5_reporting: 'Reporting Agent',
}

const AGENT_ACTION_LABELS: Record<AgentName, string> = {
  agent1_resume_parser: 'đã trích xuất dữ liệu CV của',
  agent2_matching: 'đã chấm điểm phù hợp cho',
  agent3_interview: 'đã xử lý phỏng vấn AI với',
  agent4_scheduling: 'đã đề xuất khung giờ phỏng vấn cho',
  agent5_reporting: 'đã tạo báo cáo cho',
}

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

function formatRelativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime()
  const min = Math.floor(diffMs / 60000)
  if (min < 1) return 'Vừa xong'
  if (min < 60) return `${min} phút trước`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr} giờ trước`
  const days = Math.floor(hr / 24)
  return `${days} ngày trước`
}

function getInitials(name: string): string {
  return name.split(' ').filter(Boolean).map((w) => w[0]).slice(0, 2).join('').toUpperCase()
}

export default function RecruiterDashboardPage() {
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const firstName = user ? getFirstName(user.fullName) : 'bạn'

  const statsQuery = useQuery({ queryKey: ['dashboard-stats'], queryFn: getDashboardStats })
  const candidatesQuery = useQuery({
    queryKey: ['recruiter-candidates', 'dashboard'],
    queryFn: () => getRecruiterCandidates({ sort: 'appliedAt', limit: 100 }),
  })
  const schedulesQuery = useQuery({ queryKey: ['recruiter-schedules'], queryFn: getRecruiterSchedules })
  const agentStatsQuery = useQuery({ queryKey: ['agent-stats'], queryFn: getAgentStats })
  const agentActivityQuery = useQuery({ queryKey: ['agent-activity'], queryFn: getAgentActivity })

  const isLoading =
    statsQuery.isLoading || candidatesQuery.isLoading || schedulesQuery.isLoading || agentStatsQuery.isLoading

  const stats = statsQuery.data
  const candidates = candidatesQuery.data?.data ?? []
  const schedules = schedulesQuery.data ?? []
  const agentStats = agentStatsQuery.data ?? []
  const agentActivity = agentActivityQuery.data ?? []

  const now = new Date().getTime()
  const newThisWeek = candidates.filter((c) => now - new Date(c.appliedAt).getTime() < 7 * DAY_MS).length
  const newLastWeek = candidates.filter((c) => {
    const diff = now - new Date(c.appliedAt).getTime()
    return diff >= 7 * DAY_MS && diff < 14 * DAY_MS
  }).length
  const weekDelta = newThisWeek - newLastWeek

  const pendingScheduleCount = schedules.filter((s) => !s.schedule).length
  const totalAgentExecutions = agentStats.reduce((sum, a) => sum + a.totalExecutions, 0)
  const hiredCount = stats?.statusFunnel.hired ?? 0

  const metrics = [
    {
      label: 'Ứng viên mới (7 ngày qua)',
      value: newThisWeek,
      delta:
        weekDelta === 0
          ? 'Không đổi so với 7 ngày trước'
          : `${weekDelta > 0 ? '↑' : '↓'} ${Math.abs(weekDelta)} so với 7 ngày trước`,
      deltaType: weekDelta > 0 ? ('up' as const) : weekDelta < 0 ? ('amber' as const) : ('flat' as const),
      icon: 'ti-user-plus',
      iconColor: 'indigo',
    },
    {
      label: 'Lượt AI đã xử lý',
      value: totalAgentExecutions,
      delta: 'Tổng số lượt agent đã thực thi',
      deltaType: 'flat' as const,
      icon: 'ti-robot',
      iconColor: 'teal',
    },
    {
      label: 'Cần hành động',
      value: pendingScheduleCount,
      delta: 'Chờ gửi khung giờ phỏng vấn',
      deltaType: pendingScheduleCount > 0 ? ('amber' as const) : ('flat' as const),
      icon: 'ti-alert-circle',
      iconColor: 'amber',
    },
    {
      label: 'Đã tuyển',
      value: hiredCount,
      delta: 'Tổng số ứng viên trúng tuyển',
      deltaType: 'up' as const,
      icon: 'ti-user-check',
      iconColor: 'green',
    },
  ]

  const funnel = stats?.statusFunnel
  const pipeline = funnel
    ? [
        { label: 'Vừa nộp đơn', count: funnel.pending, color: 'var(--status-pending)' },
        { label: 'AI đã chấm điểm', count: funnel.matched, color: 'var(--status-matched)' },
        { label: 'Phỏng vấn AI', count: funnel.interviewed, color: 'var(--status-interviewed)' },
        {
          label: 'Chờ lịch / đã hẹn',
          count: funnel.schedule_sent + funnel.scheduled + funnel.completed,
          color: 'var(--status-scheduled)',
        },
        { label: 'Đã tuyển', count: funnel.hired, color: 'var(--status-hired)' },
      ]
    : []
  const maxPipelineCount = Math.max(1, ...pipeline.map((p) => p.count))

  const recentApplications = candidates.slice(0, 5)

  const todayStr = new Date().toDateString()
  const todaysInterviews = schedules
    .filter((s) => s.schedule?.confirmedStartTime && new Date(s.schedule.confirmedStartTime).toDateString() === todayStr)
    .sort(
      (a, b) =>
        new Date(a.schedule!.confirmedStartTime!).getTime() - new Date(b.schedule!.confirmedStartTime!).getTime(),
    )

  function agentFeedText(item: (typeof agentActivity)[number]): ReactNode {
    const name = AGENT_LABELS[item.agentName]
    if (!item.success) {
      return (
        <>
          <b>{name}</b> gặp lỗi khi xử lý hồ sơ <b>{item.candidateName}</b> ({item.jobTitle})
        </>
      )
    }
    return (
      <>
        <b>{name}</b> {AGENT_ACTION_LABELS[item.agentName]} <b>{item.candidateName}</b> — {item.jobTitle}
      </>
    )
  }

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="rd-empty">
          <i className="ti ti-loader-2 rd-spin" /> Đang tải dashboard…
        </div>
      </DashboardLayout>
    )
  }

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
      </div>

      {/* ── Metric cards ── */}
      <div className="rd-metrics">
        {metrics.map((m) => (
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
              <button className="rd-panel-link" onClick={() => navigate('/recruiter/candidates')}>
                Xem chi tiết
              </button>
            </div>
            {pipeline.length === 0 ? (
              <div className="rd-empty rd-empty--inline">Chưa có dữ liệu ứng viên.</div>
            ) : (
              pipeline.map((row) => (
                <div key={row.label} className="rd-funnel-row">
                  <span className="rd-funnel-label">{row.label}</span>
                  <div className="rd-funnel-track">
                    <div
                      className="rd-funnel-fill"
                      style={{ width: `${(row.count / maxPipelineCount) * 100}%`, background: row.color }}
                    />
                  </div>
                  <span className="rd-funnel-count">{row.count}</span>
                </div>
              ))
            )}
          </div>

          {/* Recent applications panel */}
          <div className="rd-panel">
            <div className="rd-panel-head">
              <h2>Hồ sơ gần đây</h2>
              <button className="rd-panel-link" onClick={() => navigate('/recruiter/candidates')}>
                Xem tất cả
              </button>
            </div>
            {recentApplications.length === 0 ? (
              <div className="rd-empty rd-empty--inline">Chưa có ứng viên nào nộp CV.</div>
            ) : (
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
                  {recentApplications.map((app) => {
                    const band = getScoreBand(app.matching?.overallScore ?? null)
                    const scoreClass = band === 'medium' ? 'mid' : (band ?? 'low')
                    return (
                      <tr
                        key={app.applicationId}
                        className="rd-row-clickable"
                        onClick={() => navigate(`/recruiter/candidates/${app.applicationId}`)}
                      >
                        <td>
                          <div className="rd-cand-cell">
                            <div className="rd-cand-avatar">{getInitials(app.candidate.fullName)}</div>
                            <div>
                              <div className="rd-cand-name">{app.candidate.fullName}</div>
                              <div className="rd-cand-role">{app.candidate.email}</div>
                            </div>
                          </div>
                        </td>
                        <td>{app.job.title}</td>
                        <td>
                          {app.matching ? (
                            <span className={`rd-score-pill rd-score-${scoreClass}`}>
                              {Math.round(app.matching.overallScore)}
                            </span>
                          ) : (
                            <span className="rd-score-empty">—</span>
                          )}
                        </td>
                        <td>
                          <span className={`badge badge-${app.status}`}>{STATUS_LABELS[app.status]}</span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Right column */}
        <div>
          {/* Agent activity panel */}
          <div className="rd-panel">
            <div className="rd-panel-head">
              <h2>Hoạt động AI Agent</h2>
            </div>
            {agentActivity.length === 0 ? (
              <div className="rd-empty rd-empty--inline">Chưa có hoạt động agent nào.</div>
            ) : (
              agentActivity.map((item) => (
                <div key={item.id} className="rd-feed-item">
                  <div className={`rd-feed-icon ${item.success ? 'teal' : 'amber'}`}>
                    <i className={`ti ${item.success ? 'ti-robot' : 'ti-alert-circle'}`} />
                  </div>
                  <div>
                    <div className="rd-feed-text">{agentFeedText(item)}</div>
                    <div className="rd-feed-time">{formatRelativeTime(item.startedAt)}</div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Today's interviews panel */}
          <div className="rd-panel">
            <div className="rd-panel-head">
              <h2>Lịch phỏng vấn hôm nay</h2>
              <button className="rd-panel-link" onClick={() => navigate('/recruiter/interviews')}>
                Xem lịch
              </button>
            </div>
            {todaysInterviews.length === 0 ? (
              <div className="rd-empty rd-empty--inline">Hôm nay chưa có lịch phỏng vấn nào.</div>
            ) : (
              todaysInterviews.map((iv) => (
                <div key={iv.applicationId} className="rd-interview-item">
                  <div className="rd-interview-time">
                    <div className="rd-time-value">
                      {new Date(iv.schedule!.confirmedStartTime!).toLocaleTimeString('vi-VN', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </div>
                    <div className="rd-time-label">Hôm nay</div>
                  </div>
                  <div>
                    <div className="rd-interview-name">{iv.candidateName}</div>
                    <div className="rd-interview-meta">{iv.jobTitle}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
