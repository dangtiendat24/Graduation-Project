import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQueries, useQuery } from '@tanstack/react-query'
import DashboardLayout from '../../layouts/DashboardLayout/DashboardLayout'
import { getMyJobs, type Job } from '../../api/jobs'
import { getJobApplications } from '../../api/rankings'
import './RecruiterCandidatesPage.css'

const STATUS_LABEL: Record<Job['status'], string> = {
  draft: 'Nháp',
  active: 'Đang tuyển',
  closed: 'Đã đóng',
}

const LEVEL_LABEL: Record<string, string> = {
  intern: 'Intern',
  junior: 'Junior',
  middle: 'Middle',
  senior: 'Senior',
  lead: 'Lead',
  director: 'Director',
}

type StatusFilter = 'all' | 'active' | 'closed'

export default function RecruiterCandidatesPage() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')

  const { data: jobs = [], isLoading, isError } = useQuery({
    queryKey: ['my-jobs'],
    queryFn: getMyJobs,
  })

  const publishedJobs = useMemo(
    () => jobs.filter((j) => j.status === 'active' || j.status === 'closed'),
    [jobs],
  )

  const countQueries = useQueries({
    queries: publishedJobs.map((job) => ({
      queryKey: ['job-applicant-count', job.id],
      queryFn: () => getJobApplications(job.id, { limit: 1 }),
      staleTime: 30_000,
    })),
  })

  const applicantMetaByJobId = useMemo(() => {
    const map = new Map<string, { total?: number; loading: boolean }>()
    publishedJobs.forEach((job, i) => {
      const q = countQueries[i]
      map.set(job.id, {
        total: q?.data?.meta.total,
        loading: Boolean(q?.isLoading || q?.isFetching),
      })
    })
    return map
  }, [publishedJobs, countQueries])

  const filteredJobs = useMemo(() => {
    const q = search.trim().toLowerCase()
    return publishedJobs.filter((job) => {
      if (statusFilter !== 'all' && job.status !== statusFilter) return false
      if (!q) return true
      return (
        job.title.toLowerCase().includes(q) ||
        (job.department?.toLowerCase().includes(q) ?? false) ||
        (job.location?.toLowerCase().includes(q) ?? false)
      )
    })
  }, [publishedJobs, search, statusFilter])

  const totalApplicants = useMemo(
    () =>
      [...applicantMetaByJobId.values()].reduce(
        (sum, meta) => sum + (meta.total ?? 0),
        0,
      ),
    [applicantMetaByJobId],
  )

  return (
    <DashboardLayout>
      <div className="rcp-page">
        <div className="rcp-header">
          <div>
            <h1 className="rcp-title">Vị trí ứng tuyển</h1>
            <p className="rcp-sub">
              Chọn icon Ranking để xem xếp hạng ứng viên của vị trí đó. Trong trang xếp hạng, bấm nút mũi tên để xem CV từng ứng viên.
            </p>
          </div>
        </div>

        {!isLoading && publishedJobs.length > 0 && (
          <div className="rcp-stats">
            <div className="rcp-stat-card">
              <div className="rcp-stat-val">{publishedJobs.length}</div>
              <div className="rcp-stat-lbl">Vị trí</div>
            </div>
            <div className="rcp-stat-card rcp-stat-card--indigo">
              <div className="rcp-stat-val">{totalApplicants}</div>
              <div className="rcp-stat-lbl">Tổng ứng viên</div>
            </div>
            <div className="rcp-stat-card rcp-stat-card--teal">
              <div className="rcp-stat-val">
                {publishedJobs.filter((j) => j.status === 'active').length}
              </div>
              <div className="rcp-stat-lbl">Đang tuyển</div>
            </div>
          </div>
        )}

        <div className="rcp-filters-card">
          <div className="rcp-search-box">
            <i className="ti ti-search" />
            <input
              type="text"
              placeholder="Tìm vị trí theo tên, phòng ban, địa điểm…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="rcp-filter-select">
            <i className="ti ti-filter" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="active">Đang tuyển</option>
              <option value="closed">Đã đóng</option>
            </select>
          </div>
        </div>

        {isLoading ? (
          <div className="rcp-empty-state">
            <i className="ti ti-loader-2 rcp-spin" />
            <div>Đang tải danh sách vị trí…</div>
          </div>
        ) : isError ? (
          <div className="rcp-empty-state">
            <i className="ti ti-alert-circle" />
            <div>Không tải được danh sách vị trí. Vui lòng thử lại.</div>
          </div>
        ) : filteredJobs.length === 0 ? (
          <div className="rcp-empty-state">
            <div className="rcp-empty-icon"><i className="ti ti-briefcase-off" /></div>
            <div className="rcp-empty-title">
              {publishedJobs.length === 0
                ? 'Chưa có vị trí ứng tuyển nào'
                : 'Không tìm thấy vị trí phù hợp'}
            </div>
            <div className="rcp-empty-sub">
              {publishedJobs.length === 0
                ? 'Đăng tin tuyển dụng và chờ ứng viên nộp CV để bắt đầu.'
                : 'Thử đổi từ khóa hoặc bộ lọc trạng thái.'}
            </div>
          </div>
        ) : (
          <div className="rcp-job-list">
            {filteredJobs.map((job) => {
              const meta = applicantMetaByJobId.get(job.id)
              const count = meta?.total
              const countLoading = Boolean(meta?.loading && count === undefined)

              return (
                <div key={job.id} className="rcp-job-card">
                  <div className="rcp-job-main">
                    <div className="rcp-job-title-row">
                      <span className="rcp-job-title">{job.title}</span>
                      <span className={`rcp-status rcp-status--${job.status}`}>
                        {STATUS_LABEL[job.status]}
                      </span>
                    </div>
                    <div className="rcp-job-meta">
                      {job.department && (
                        <span className="rcp-meta-item">
                          <i className="ti ti-building" /> {job.department}
                        </span>
                      )}
                      {job.location && (
                        <span className="rcp-meta-item">
                          <i className="ti ti-map-pin" /> {job.location}
                        </span>
                      )}
                      {job.level && (
                        <span className="rcp-meta-item">
                          <i className="ti ti-award" /> {LEVEL_LABEL[job.level] ?? job.level}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="rcp-job-right">
                    <div className="rcp-applicant-count">
                      {countLoading ? (
                        <i className="ti ti-loader-2 rcp-spin" />
                      ) : (
                        <>
                          <span className="rcp-applicant-num">{count ?? 0}</span>
                          <span className="rcp-applicant-lbl">ứng viên</span>
                        </>
                      )}
                    </div>
                    {/* Giống nút Ranking cũ — vào trang xếp hạng của vị trí */}
                    <button
                      type="button"
                      className="rcp-btn-view"
                      title="Xem xếp hạng ứng viên theo tin tuyển dụng này"
                      onClick={() => navigate(`/recruiter/jobs/${job.id}/rankings`)}
                    >
                      <i className="ti ti-chart-bar" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
