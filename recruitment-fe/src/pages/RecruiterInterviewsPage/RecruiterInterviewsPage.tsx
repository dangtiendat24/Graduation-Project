import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import DashboardLayout from '../../layouts/DashboardLayout/DashboardLayout'
import { getRecruiterSchedules } from '../../api/schedule'
import './RecruiterInterviewsPage.css'

interface JobGroupSummary {
  jobId: string
  jobTitle: string
  total: number
  pending: number
  waiting: number
  confirmed: number
}

export default function RecruiterInterviewsPage() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')

  const { data, isLoading, isError } = useQuery({
    queryKey: ['recruiter-schedules'],
    queryFn: getRecruiterSchedules,
  })

  const jobGroups = useMemo(() => {
    const map = new Map<string, JobGroupSummary>()
    ;(data ?? []).forEach((item) => {
      const group = map.get(item.jobId) ?? {
        jobId: item.jobId,
        jobTitle: item.jobTitle,
        total: 0,
        pending: 0,
        waiting: 0,
        confirmed: 0,
      }
      group.total += 1
      if (!item.schedule) group.pending += 1
      else if (item.schedule.status === 'pending') group.waiting += 1
      else if (item.schedule.status === 'confirmed') group.confirmed += 1
      map.set(item.jobId, group)
    })
    return Array.from(map.values())
  }, [data])

  const filteredGroups = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return jobGroups
    return jobGroups.filter((g) => g.jobTitle.toLowerCase().includes(q))
  }, [jobGroups, search])

  const totals = useMemo(
    () => ({
      jobs: jobGroups.length,
      candidates: jobGroups.reduce((sum, g) => sum + g.total, 0),
      waitingConfirm: jobGroups.reduce((sum, g) => sum + g.waiting, 0),
    }),
    [jobGroups],
  )

  return (
    <DashboardLayout>
      <div className="rig-page">
        <div className="rig-header rig-header--row">
          <div>
            <h1 className="rig-title">Lịch phỏng vấn</h1>
            <p className="rig-sub">Chọn 1 vị trí để xem và quản lý khung giờ phỏng vấn của từng ứng viên.</p>
          </div>
          <button type="button" className="rig-btn-calendar" onClick={() => navigate('/recruiter/interviews/calendar')}>
            <i className="ti ti-calendar-week" />
            Xem dạng lịch tuần
          </button>
        </div>

        {!isLoading && jobGroups.length > 0 && (
          <div className="rig-stats">
            <div className="rig-stat-card">
              <div className="rig-stat-val">{totals.jobs}</div>
              <div className="rig-stat-lbl">Vị trí</div>
            </div>
            <div className="rig-stat-card rig-stat-card--indigo">
              <div className="rig-stat-val">{totals.candidates}</div>
              <div className="rig-stat-lbl">Ứng viên</div>
            </div>
            <div className="rig-stat-card rig-stat-card--amber">
              <div className="rig-stat-val">{totals.waitingConfirm}</div>
              <div className="rig-stat-lbl">Chờ ứng viên xác nhận</div>
            </div>
          </div>
        )}

        {jobGroups.length > 0 && (
          <div className="rig-search-box">
            <i className="ti ti-search" />
            <input
              type="text"
              placeholder="Tìm vị trí theo tên..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        )}

        {isLoading ? (
          <div className="rig-empty-state">
            <i className="ti ti-loader-2 rig-spin" />
            <div>Đang tải danh sách…</div>
          </div>
        ) : isError ? (
          <div className="rig-empty-state">
            <i className="ti ti-alert-circle" />
            <div>Không tải được danh sách lịch phỏng vấn.</div>
          </div>
        ) : filteredGroups.length === 0 ? (
          <div className="rig-empty-state">
            <div className="rig-empty-icon">
              <i className="ti ti-calendar-off" />
            </div>
            <div className="rig-empty-title">
              {jobGroups.length === 0 ? 'Chưa có ứng viên nào được mời phỏng vấn' : 'Không tìm thấy vị trí phù hợp'}
            </div>
            {jobGroups.length === 0 && (
              <div className="rig-empty-sub">
                Mời ứng viên phỏng vấn ở trang Xếp hạng ứng viên để bắt đầu đặt lịch.
              </div>
            )}
          </div>
        ) : (
          <div className="rig-job-list">
            {filteredGroups.map((group) => (
              <div
                key={group.jobId}
                className="rig-job-card"
                onClick={() => navigate(`/recruiter/interviews/${group.jobId}`)}
              >
                <div className="rig-job-main">
                  <div className="rig-job-title">{group.jobTitle}</div>
                  <div className="rig-job-meta">
                    {group.pending > 0 && (
                      <span className="rig-meta-item rig-meta-item--pending">
                        {group.pending} chưa gửi khung giờ
                      </span>
                    )}
                    {group.waiting > 0 && (
                      <span className="rig-meta-item rig-meta-item--waiting">{group.waiting} chờ xác nhận</span>
                    )}
                    {group.confirmed > 0 && (
                      <span className="rig-meta-item rig-meta-item--confirmed">{group.confirmed} đã xác nhận</span>
                    )}
                  </div>
                </div>

                <div className="rig-job-right">
                  <div className="rig-applicant-count">
                    <span className="rig-applicant-num">{group.total}</span>
                    <span className="rig-applicant-lbl">ứng viên</span>
                  </div>
                  <button type="button" className="rig-btn-view" title="Xem lịch phỏng vấn của vị trí này">
                    <i className="ti ti-chevron-right" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
