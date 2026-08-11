import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { isAxiosError } from 'axios'
import DashboardLayout from '../../layouts/DashboardLayout/DashboardLayout'
import { getRecruiterCandidates } from '../../api/candidates'
import { getScoreBand } from '../../api/rankings'
import { getMyJobs } from '../../api/jobs'
import './RecruiterHiringResultsPage.css'

const RESULT_LIMIT = 100

// Lỗi 4xx không đổi kết quả dù retry — tránh giữ UI loading thêm nhiều giây vô ích.
function shouldRetry(failureCount: number, error: unknown): boolean {
  if (isAxiosError(error) && error.response && error.response.status < 500) return false
  return failureCount < 2
}

function getInitial(name: string): string {
  return name.trim().charAt(0).toUpperCase() || '?'
}

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(
    new Date(iso),
  )
}

type ResultTab = 'all' | 'hired' | 'rejected'

export default function RecruiterHiringResultsPage() {
  const navigate = useNavigate()
  const [tab, setTab] = useState<ResultTab>('all')
  const [jobId, setJobId] = useState('')

  const jobsQuery = useQuery({
    queryKey: ['my-jobs'],
    queryFn: getMyJobs,
  })
  const jobs = jobsQuery.data ?? []

  const hiredQuery = useQuery({
    queryKey: ['hiring-results', 'hired', jobId],
    queryFn: () =>
      getRecruiterCandidates({
        status: 'hired',
        jobId: jobId || undefined,
        limit: RESULT_LIMIT,
        sort: 'appliedAt',
      }),
    retry: shouldRetry,
  })
  const rejectedQuery = useQuery({
    queryKey: ['hiring-results', 'rejected', jobId],
    queryFn: () =>
      getRecruiterCandidates({
        status: 'rejected',
        jobId: jobId || undefined,
        limit: RESULT_LIMIT,
        sort: 'appliedAt',
      }),
    retry: shouldRetry,
  })

  const isLoading = hiredQuery.isLoading || rejectedQuery.isLoading
  const isError = hiredQuery.isError || rejectedQuery.isError

  const hiredItems = useMemo(() => hiredQuery.data?.data ?? [], [hiredQuery.data])
  const rejectedItems = useMemo(() => rejectedQuery.data?.data ?? [], [rejectedQuery.data])

  const allItems = useMemo(
    () => [...hiredItems, ...rejectedItems].sort((a, b) => b.appliedAt.localeCompare(a.appliedAt)),
    [hiredItems, rejectedItems],
  )

  const visibleItems = tab === 'all' ? allItems : tab === 'hired' ? hiredItems : rejectedItems

  return (
    <DashboardLayout>
      <div className="hr-page-head">
        <div>
          <h1>Kết quả tuyển dụng</h1>
          <p>Tổng hợp ứng viên đã tuyển và từ chối trên tất cả tin tuyển dụng</p>
        </div>

        {jobs.length > 0 && (
          <div className="hr-filter-select">
            <i className="ti ti-briefcase" />
            <select value={jobId} onChange={(e) => setJobId(e.target.value)}>
              <option value="">Tất cả vị trí</option>
              {jobs.map((job) => (
                <option key={job.id} value={job.id}>
                  {job.title}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="hr-empty">Đang tải…</div>
      ) : isError ? (
        <div className="hr-empty hr-empty--error">Không tải được kết quả tuyển dụng.</div>
      ) : (
        <>
          <div className="hr-tab-bar">
            <button className={`hr-tab${tab === 'all' ? ' active' : ''}`} onClick={() => setTab('all')}>
              Tất cả <span className="hr-tab-count">{allItems.length}</span>
            </button>
            <button className={`hr-tab${tab === 'hired' ? ' active' : ''}`} onClick={() => setTab('hired')}>
              Đã tuyển <span className="hr-tab-count">{hiredItems.length}</span>
            </button>
            <button className={`hr-tab${tab === 'rejected' ? ' active' : ''}`} onClick={() => setTab('rejected')}>
              Từ chối <span className="hr-tab-count">{rejectedItems.length}</span>
            </button>
          </div>

          {visibleItems.length === 0 ? (
            <div className="hr-empty">
              <i className="ti ti-users" />
              <p>Chưa có ứng viên nào ở nhóm này.</p>
            </div>
          ) : (
            <div className="hr-table-container">
              <table className="hr-table">
                <thead>
                  <tr>
                    <th>Ứng viên</th>
                    <th>Vị trí</th>
                    <th>Điểm phù hợp</th>
                    <th>Trạng thái</th>
                    <th>Ngày ứng tuyển</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleItems.map((item) => (
                    <tr
                      key={item.applicationId}
                      onClick={() => navigate(`/recruiter/candidates/${item.applicationId}`)}
                    >
                      <td>
                        <div className="hr-cand-cell">
                          <div className="hr-cand-avatar">{getInitial(item.candidate.fullName)}</div>
                          <div>
                            <div className="hr-cand-name">{item.candidate.fullName}</div>
                            <div className="hr-cand-email">{item.candidate.email}</div>
                          </div>
                        </div>
                      </td>
                      <td>{item.job.title}</td>
                      <td>
                        {item.matching ? (
                          <span
                            className={`hr-score-pill hr-score-${getScoreBand(item.matching.overallScore) ?? 'low'}`}
                          >
                            {Math.round(item.matching.overallScore)}
                          </span>
                        ) : (
                          <span className="hr-score-empty">—</span>
                        )}
                      </td>
                      <td>
                        <span className={`badge badge-${item.status}`}>
                          {item.status === 'hired' ? 'Đã tuyển' : 'Từ chối'}
                        </span>
                      </td>
                      <td>{formatDate(item.appliedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </DashboardLayout>
  )
}
