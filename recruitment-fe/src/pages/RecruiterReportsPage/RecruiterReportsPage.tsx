import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { isAxiosError } from 'axios'
import DashboardLayout from '../../layouts/DashboardLayout/DashboardLayout'
import { getMyJobs } from '../../api/jobs'
import { getReportsOverview } from '../../api/reports'
import '../RecruiterDashboardPage/RecruiterDashboardPage.css'
import './RecruiterReportsPage.css'

// Lỗi 4xx (job không thuộc recruiter, tham số không hợp lệ...) không đổi kết
// quả dù retry — tránh giữ UI loading thêm nhiều giây vô ích.
function shouldRetry(failureCount: number, error: unknown): boolean {
  if (isAxiosError(error) && error.response && error.response.status < 500) return false
  return failureCount < 2
}

function formatPercent(value: number | null): string {
  if (value === null) return '—'
  return `${Math.round(value * 100)}%`
}

function formatHours(value: number | null): string {
  if (value === null) return '—'
  if (value < 24) return `${value.toFixed(1)} giờ`
  return `${(value / 24).toFixed(1)} ngày`
}

const FUNNEL_COLORS = [
  'var(--status-pending)',
  'var(--status-matched)',
  'var(--status-interviewed)',
  'var(--status-scheduled)',
  'var(--status-hired)',
]

export default function RecruiterReportsPage() {
  const [jobId, setJobId] = useState<string>('')
  const [from, setFrom] = useState<string>('')
  const [to, setTo] = useState<string>('')

  const jobsQuery = useQuery({
    queryKey: ['my-jobs'],
    queryFn: () => getMyJobs(),
    retry: shouldRetry,
  })

  const reportsQuery = useQuery({
    queryKey: ['reports-overview', jobId, from, to],
    queryFn: () =>
      getReportsOverview({
        jobId: jobId || undefined,
        from: from || undefined,
        to: to || undefined,
      }),
    retry: shouldRetry,
  })

  const report = reportsQuery.data
  const maxEntered = report ? Math.max(1, ...report.funnel.map((f) => f.entered)) : 1

  return (
    <DashboardLayout>
      <div className="rd-page-head">
        <div>
          <h1>Báo cáo tuyển dụng</h1>
          <p>Số ứng viên sàng lọc, tỷ lệ đi tiếp từng vòng và thời gian xử lý trung bình</p>
        </div>
      </div>

      <div className="rr-filters">
        <select value={jobId} onChange={(e) => setJobId(e.target.value)} className="rr-select">
          <option value="">Tất cả tin tuyển dụng</option>
          {jobsQuery.data?.map((job) => (
            <option key={job.id} value={job.id}>
              {job.title}
            </option>
          ))}
        </select>
        <label className="rr-date-label">
          Từ
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="rr-date" />
        </label>
        <label className="rr-date-label">
          Đến
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="rr-date" />
        </label>
      </div>

      {reportsQuery.isLoading ? (
        <div className="rd-panel">Đang tải báo cáo…</div>
      ) : reportsQuery.isError ? (
        <div className="rd-panel">
          {isAxiosError(reportsQuery.error) && reportsQuery.error.response?.status === 400
            ? 'Khoảng thời gian không hợp lệ — "Từ" phải trước "Đến".'
            : 'Không tải được báo cáo. Vui lòng thử lại.'}
        </div>
      ) : report ? (
        <>
          <div className="rd-metrics">
            <div className="rd-metric-card">
              <div className="rd-metric-top">
                <span className="rd-metric-label">Ứng viên đã sàng lọc</span>
                <span className="rd-metric-icon indigo">
                  <i className="ti ti-users" />
                </span>
              </div>
              <div className="rd-metric-value">{report.headline.totalScreened}</div>
            </div>
            <div className="rd-metric-card">
              <div className="rd-metric-top">
                <span className="rd-metric-label">Đang xử lý</span>
                <span className="rd-metric-icon amber">
                  <i className="ti ti-clock" />
                </span>
              </div>
              <div className="rd-metric-value">{report.headline.inProgressCount}</div>
            </div>
            <div className="rd-metric-card">
              <div className="rd-metric-top">
                <span className="rd-metric-label">Đã tuyển</span>
                <span className="rd-metric-icon green">
                  <i className="ti ti-user-check" />
                </span>
              </div>
              <div className="rd-metric-value">{report.headline.hiredCount}</div>
            </div>
            <div className="rd-metric-card">
              <div className="rd-metric-top">
                <span className="rd-metric-label">Thời gian xử lý TB</span>
                <span className="rd-metric-icon teal">
                  <i className="ti ti-hourglass" />
                </span>
              </div>
              <div className="rd-metric-value">{formatHours(report.headline.avgTotalProcessingHours)}</div>
            </div>
          </div>

          <div className="rd-panel">
            <div className="rd-panel-head">
              <h2>Phễu tuyển dụng &amp; tỷ lệ đi tiếp từng vòng</h2>
            </div>
            <div className="rr-funnel-steps">
              {report.funnel.map((stage, i) => (
                <div key={stage.stage} className="rr-step-wrap">
                  <div className="rr-step-card" style={{ borderTopColor: FUNNEL_COLORS[i] }}>
                    <div className="rr-step-label">{stage.label}</div>
                    <div className="rr-step-count">{stage.entered}</div>
                    <div className="rr-step-bar-track">
                      <div
                        className="rr-step-bar-fill"
                        style={{
                          width: `${(stage.entered / maxEntered) * 100}%`,
                          background: FUNNEL_COLORS[i],
                        }}
                      />
                    </div>
                    <div className="rr-step-stat">
                      <span>Tỷ lệ đi tiếp</span>
                      <strong>{formatPercent(stage.passRate)}</strong>
                    </div>
                    <div className="rr-step-stat">
                      <span>TG xử lý TB</span>
                      <strong>{formatHours(stage.avgProcessingHours)}</strong>
                    </div>
                    {stage.directToSchedulingCount ? (
                      <div className="rr-step-caption">
                        {stage.directToSchedulingCount} ứng viên bỏ qua vòng phỏng vấn AI
                      </div>
                    ) : null}
                  </div>
                  {i < report.funnel.length - 1 && (
                    <i className="ti ti-chevron-right rr-step-arrow" />
                  )}
                </div>
              ))}
            </div>
          </div>
        </>
      ) : null}
    </DashboardLayout>
  )
}
