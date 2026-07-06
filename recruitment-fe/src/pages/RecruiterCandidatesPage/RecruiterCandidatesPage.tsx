import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, keepPreviousData } from '@tanstack/react-query'
import DashboardLayout from '../../layouts/DashboardLayout/DashboardLayout'
import { getMyJobs } from '../../api/jobs'
import { getRecruiterCandidates, type ApplicationStatus } from '../../api/candidates'
import './RecruiterCandidatesPage.css'

const PAGE_LIMIT = 20

// Từ điển hiển thị trạng thái application (khớp APPLICATION_STATUSES)
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

// design-tokens.css chỉ có sẵn class .badge-schedule (không phải schedule_sent)
const STATUS_BADGE_CLASS: Record<ApplicationStatus, string> = {
  pending: 'pending',
  matched: 'matched',
  interviewed: 'interviewed',
  schedule_sent: 'schedule',
  scheduled: 'scheduled',
  completed: 'completed',
  hired: 'hired',
  rejected: 'rejected',
}

function getScoreClass(score: number) {
  if (score >= 70) return 'score-high'
  if (score >= 40) return 'score-mid'
  return 'score-low'
}

function getInitials(name: string): string {
  return name.split(' ').filter(Boolean).map((w) => w[0]).slice(0, 2).join('').toUpperCase()
}

export default function RecruiterCandidatesPage() {
  const navigate = useNavigate()

  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [jobFilter, setJobFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [sort, setSort] = useState<'appliedAt' | 'overallScore'>('appliedAt')
  const [page, setPage] = useState(1)

  // Debounce search 300ms — reset về trang 1 khi search mới có hiệu lực
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput.trim())
      setPage(1)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchInput])

  function handleJobFilterChange(value: string) {
    setJobFilter(value)
    setPage(1)
  }

  function handleStatusFilterChange(value: string) {
    setStatusFilter(value)
    setPage(1)
  }

  function handleSortChange(value: 'appliedAt' | 'overallScore') {
    setSort(value)
    setPage(1)
  }

  const { data: jobs = [] } = useQuery({ queryKey: ['my-jobs'], queryFn: getMyJobs })

  const { data, isLoading, isError } = useQuery({
    queryKey: ['recruiter-candidates', jobFilter, statusFilter, search, sort, page],
    queryFn: () =>
      getRecruiterCandidates({
        jobId: jobFilter === 'all' ? undefined : jobFilter,
        status: statusFilter === 'all' ? undefined : (statusFilter as ApplicationStatus),
        search: search || undefined,
        sort,
        page,
        limit: PAGE_LIMIT,
      }),
    placeholderData: keepPreviousData,
  })

  const candidates = data?.data ?? []
  const meta = data?.meta

  return (
    <DashboardLayout>
      <div className="rcp-page">
        {/* Header Section */}
        <div className="rcp-header">
          <div>
            <h1 className="rcp-title">Hồ sơ ứng viên</h1>
            <p className="rcp-sub">
              Quản lý danh sách ứng viên đã nộp đơn. Thông tin kỹ năng đã được AI tự động trích xuất từ CV.
            </p>
          </div>
        </div>

        {/* Filters Section */}
        <div className="rcp-filters-card">
          <div className="rcp-search-box">
            <i className="ti ti-search" />
            <input
              type="text"
              placeholder="Tìm kiếm ứng viên theo tên hoặc email..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
          </div>

          <div className="rcp-filter-select">
            <i className="ti ti-briefcase" />
            <select value={jobFilter} onChange={(e) => handleJobFilterChange(e.target.value)}>
              <option value="all">Tất cả tin tuyển dụng</option>
              {jobs.map((job) => (
                <option key={job.id} value={job.id}>{job.title}</option>
              ))}
            </select>
          </div>

          <div className="rcp-filter-select">
            <i className="ti ti-filter" />
            <select value={statusFilter} onChange={(e) => handleStatusFilterChange(e.target.value)}>
              <option value="all">Tất cả trạng thái</option>
              {Object.entries(STATUS_LABELS).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>

          <div className="rcp-sort-toggle">
            <button
              className={`rcp-sort-btn${sort === 'appliedAt' ? ' rcp-sort-btn--active' : ''}`}
              onClick={() => handleSortChange('appliedAt')}
            >
              Ngày nộp
            </button>
            <button
              className={`rcp-sort-btn${sort === 'overallScore' ? ' rcp-sort-btn--active' : ''}`}
              onClick={() => handleSortChange('overallScore')}
            >
              Điểm phù hợp
            </button>
          </div>
        </div>

        {/* Candidates List / Table */}
        <div className="rcp-table-container">
          <table className="rcp-table">
            <thead>
              <tr>
                <th>Ứng viên</th>
                <th>Vị trí ứng tuyển</th>
                <th style={{ width: '30%' }}>Kỹ năng trích xuất (AI)</th>
                <th>Điểm số</th>
                <th>Trạng thái</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={6}>
                    <div className="rcp-empty-state">
                      <i className="ti ti-loader-2 rcp-spin" />
                      <div>Đang tải danh sách ứng viên…</div>
                    </div>
                  </td>
                </tr>
              ) : isError ? (
                <tr>
                  <td colSpan={6}>
                    <div className="rcp-empty-state">
                      <i className="ti ti-alert-circle" />
                      <div>Không tải được danh sách ứng viên. Vui lòng thử lại.</div>
                    </div>
                  </td>
                </tr>
              ) : candidates.length > 0 ? (
                candidates.map((c) => (
                  <tr key={c.applicationId}>
                    <td>
                      <div className="rcp-cand-info">
                        <div className="rcp-cand-avatar">
                          {c.candidate.avatarUrl ? (
                            <img src={c.candidate.avatarUrl} alt={c.candidate.fullName} />
                          ) : (
                            getInitials(c.candidate.fullName)
                          )}
                        </div>
                        <div>
                          <div className="rcp-cand-name">{c.candidate.fullName}</div>
                          <div className="rcp-cand-meta">
                            <i className="ti ti-mail" /> {c.candidate.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="rcp-job-role">{c.job.title}</div>
                      <div className="rcp-cand-meta">
                        <i className="ti ti-calendar" /> {new Date(c.appliedAt).toLocaleDateString('vi-VN')}
                      </div>
                    </td>
                    <td>
                      {c.isParsed && c.parsedData ? (
                        <>
                          <div className="rcp-skills-wrap">
                            {c.parsedData.skills.slice(0, 3).map((skill, i) => (
                              <span key={i} className="rcp-skill-tag">{skill}</span>
                            ))}
                            {c.parsedData.skills.length > 3 && (
                              <span className="rcp-skill-tag more">+{c.parsedData.skills.length - 3}</span>
                            )}
                            {c.parsedData.skills.length === 0 && (
                              <span className="rcp-cand-meta">Chưa có kỹ năng trích xuất</span>
                            )}
                          </div>
                          {c.parsedData.experience.length > 0 && (
                            <div className="rcp-exp-hint">
                              <i className="ti ti-briefcase" /> {c.parsedData.experience.length} kinh nghiệm
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="rcp-cand-meta">
                          <i className="ti ti-loader-2 rcp-spin" /> Đang xử lý CV
                        </div>
                      )}
                    </td>
                    <td>
                      {c.matching ? (
                        <span className={`rcp-score-pill ${getScoreClass(c.matching.overallScore)}`}>
                          {Math.round(c.matching.overallScore)}
                        </span>
                      ) : (
                        <span className="rcp-cand-meta">Chưa có điểm</span>
                      )}
                    </td>
                    <td>
                      <span className={`badge badge-${STATUS_BADGE_CLASS[c.status]}`}>
                        {STATUS_LABELS[c.status]}
                      </span>
                    </td>
                    <td>
                      <button
                        className="rcp-btn-view"
                        title="Xem chi tiết CV & Báo cáo"
                        onClick={() => navigate(`/recruiter/candidates/${c.applicationId}`)}
                      >
                        <i className="ti ti-chevron-right" />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6}>
                    <div className="rcp-empty-state">
                      <div className="rcp-empty-icon"><i className="ti ti-user-x" /></div>
                      <div>Không tìm thấy ứng viên nào phù hợp</div>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {meta && meta.totalPages > 1 && (
          <div className="rcp-pagination">
            <button
              className="rcp-page-btn"
              disabled={meta.page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              <i className="ti ti-chevron-left" /> Trước
            </button>
            <span className="rcp-page-info">Trang {meta.page} / {meta.totalPages} · {meta.total} ứng viên</span>
            <button
              className="rcp-page-btn"
              disabled={meta.page >= meta.totalPages}
              onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
            >
              Sau <i className="ti ti-chevron-right" />
            </button>
          </div>
        )}

      </div>
    </DashboardLayout>
  )
}
