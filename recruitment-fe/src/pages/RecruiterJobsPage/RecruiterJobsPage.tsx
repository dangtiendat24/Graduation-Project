import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import DashboardLayout from '../../layouts/DashboardLayout/DashboardLayout'
import { getMyJobs, closeJob, deleteJob, type Job } from '../../api/jobs'
import './RecruiterJobsPage.css'

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

function WorkModelBadge({ model }: { model: Job['workModel'] }) {
  if (!model) return null
  const icons: Record<string, string> = { onsite: 'ti-building', hybrid: 'ti-home-and-building', remote: 'ti-home' }
  return (
    <span className="rjl-wm-badge">
      <i className={`ti ${icons[model]}`} /> {model}
    </span>
  )
}

function StatusBadge({ status }: { status: Job['status'] }) {
  return <span className={`rjl-status rjl-status--${status}`}>{STATUS_LABEL[status]}</span>
}

export default function RecruiterJobsPage() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const { data: jobs = [], isLoading, isError } = useQuery({
    queryKey: ['my-jobs'],
    queryFn: getMyJobs,
  })

  const closeMut = useMutation({
    mutationFn: closeJob,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['my-jobs'] }),
  })

  const deleteMut = useMutation({
    mutationFn: deleteJob,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-jobs'] })
      setDeleteId(null)
    },
  })

  const topActions = (
    <button className="rjl-btn-primary" onClick={() => navigate('/recruiter/jobs/create')}>
      <i className="ti ti-plus" /> Đăng tin mới
    </button>
  )

  return (
    <DashboardLayout actions={topActions}>
      <div className="rjl-page">

        <div className="rjl-header">
          <div>
            <h1 className="rjl-title">Tin tuyển dụng</h1>
            <p className="rjl-sub">Quản lý tất cả tin đăng tuyển của bạn</p>
          </div>
        </div>

        {/* Summary cards */}
        {!isLoading && jobs.length > 0 && (
          <div className="rjl-stats">
            {[
              { label: 'Tổng tin', value: jobs.length, cls: '' },
              { label: 'Đang tuyển', value: jobs.filter(j => j.status === 'active').length, cls: 'active' },
              { label: 'Bản nháp', value: jobs.filter(j => j.status === 'draft').length, cls: 'draft' },
              { label: 'Đã đóng', value: jobs.filter(j => j.status === 'closed').length, cls: 'closed' },
            ].map(s => (
              <div key={s.label} className={`rjl-stat-card${s.cls ? ` rjl-stat-card--${s.cls}` : ''}`}>
                <div className="rjl-stat-val">{s.value}</div>
                <div className="rjl-stat-lbl">{s.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Content */}
        {isLoading ? (
          <div className="rjl-loading">
            <i className="ti ti-loader-2 rjl-spin" /> Đang tải danh sách tin…
          </div>
        ) : isError ? (
          <div className="rjl-empty rjl-empty--error">
            <i className="ti ti-alert-circle rjl-empty-icon" />
            <p>Không tải được danh sách tin tuyển dụng. Vui lòng thử lại.</p>
          </div>
        ) : jobs.length === 0 ? (
          <div className="rjl-empty">
            <i className="ti ti-briefcase rjl-empty-icon" />
            <p className="rjl-empty-title">Chưa có tin tuyển dụng nào</p>
            <p className="rjl-empty-sub">Tạo tin đầu tiên để bắt đầu thu hút ứng viên</p>
            <button className="rjl-btn-primary" onClick={() => navigate('/recruiter/jobs/create')}>
              <i className="ti ti-plus" /> Đăng tin tuyển dụng
            </button>
          </div>
        ) : (
          <div className="rjl-list">
            {jobs.map(job => (
              <div key={job.id} className="rjl-job-card">
                <div className="rjl-job-main">
                  <div className="rjl-job-title-row">
                    <span className="rjl-job-title">{job.title}</span>
                    <StatusBadge status={job.status} />
                  </div>
                  <div className="rjl-job-meta">
                    {job.location && (
                      <span className="rjl-meta-item">
                        <i className="ti ti-map-pin" /> {job.location}
                      </span>
                    )}
                    {job.level && (
                      <span className="rjl-meta-item">
                        <i className="ti ti-award" /> {LEVEL_LABEL[job.level] ?? job.level}
                      </span>
                    )}
                    {job.department && (
                      <span className="rjl-meta-item">
                        <i className="ti ti-users" /> {job.department}
                      </span>
                    )}
                    {job.headcount > 1 && (
                      <span className="rjl-meta-item">
                        <i className="ti ti-user-plus" /> {job.headcount} vị trí
                      </span>
                    )}
                    <WorkModelBadge model={job.workModel} />
                  </div>
                  {job.requiredSkills && job.requiredSkills.length > 0 && (
                    <div className="rjl-skills">
                      {job.requiredSkills.slice(0, 5).map((s, i) => (
                        <span key={i} className="rjl-skill-tag">{s}</span>
                      ))}
                      {job.requiredSkills.length > 5 && (
                        <span className="rjl-skill-tag rjl-skill-more">+{job.requiredSkills.length - 5}</span>
                      )}
                    </div>
                  )}
                </div>
                <div className="rjl-job-right">
                  {job.salaryRange && (
                    <div className="rjl-salary">{job.salaryRange}</div>
                  )}
                  {job.deadline && (
                    <div className="rjl-deadline">
                      <i className="ti ti-calendar" /> Hạn: {new Date(job.deadline).toLocaleDateString('vi-VN')}
                    </div>
                  )}
                  <div className="rjl-updated">
                    Cập nhật: {new Date(job.updatedAt).toLocaleDateString('vi-VN')}
                  </div>
                  <div className="rjl-actions">
                    <button
                      className="rjl-action-btn rjl-action-btn--edit"
                      title="Chỉnh sửa"
                      onClick={() => navigate(`/recruiter/jobs/${job.id}/edit`)}
                    >
                      <i className="ti ti-pencil" />
                    </button>
                    {job.status === 'active' && (
                      <button
                        className="rjl-action-btn rjl-action-btn--close"
                        title="Đóng tin"
                        disabled={closeMut.isPending}
                        onClick={() => closeMut.mutate(job.id)}
                      >
                        <i className="ti ti-lock" />
                      </button>
                    )}
                    <button
                      className="rjl-action-btn rjl-action-btn--delete"
                      title="Xóa tin"
                      onClick={() => setDeleteId(job.id)}
                    >
                      <i className="ti ti-trash" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Delete confirm modal */}
        {deleteId && (
          <div className="rjl-overlay" onClick={() => setDeleteId(null)}>
            <div className="rjl-modal" onClick={e => e.stopPropagation()}>
              <div className="rjl-modal-icon"><i className="ti ti-trash" /></div>
              <h3 className="rjl-modal-title">Xoá tin tuyển dụng?</h3>
              <p className="rjl-modal-sub">Hành động này không thể hoàn tác. Tất cả ứng viên đã nộp đơn cho tin này cũng sẽ bị ảnh hưởng.</p>
              <div className="rjl-modal-actions">
                <button className="rjl-btn-ghost" onClick={() => setDeleteId(null)}>Huỷ</button>
                <button
                  className="rjl-btn-danger"
                  disabled={deleteMut.isPending}
                  onClick={() => deleteMut.mutate(deleteId)}
                >
                  {deleteMut.isPending ? 'Đang xoá…' : 'Xoá tin'}
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </DashboardLayout>
  )
}
