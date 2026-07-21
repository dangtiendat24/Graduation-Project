import { useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import DashboardLayout from '../../layouts/DashboardLayout/DashboardLayout'
import { getRecruiterCandidates, type ApplicationStatus } from '../../api/candidates'
import './RecruiterCandidateDetailPage.css'

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

function getInitials(name: string): string {
  return name.split(' ').filter(Boolean).map((w) => w[0]).slice(0, 2).join('').toUpperCase()
}

export default function RecruiterCandidateDetailPage() {
  const { applicationId } = useParams<{ applicationId: string }>()
  const navigate = useNavigate()

  // BE chưa có GET theo applicationId — lấy từ danh sách (giới hạn 100).
  const { data, isLoading, isError } = useQuery({
    queryKey: ['recruiter-candidate-detail', applicationId],
    queryFn: () => getRecruiterCandidates({ limit: 100 }),
    enabled: !!applicationId,
  })

  const item = data?.data.find((c) => c.applicationId === applicationId) ?? null

  return (
    <DashboardLayout>
      <div className="rcd-page">
        <button type="button" className="rcd-back" onClick={() => navigate(-1)}>
          <i className="ti ti-arrow-left" /> Quay lại
        </button>

        {isLoading ? (
          <div className="rcd-empty">
            <i className="ti ti-loader-2 rcd-spin" /> Đang tải hồ sơ ứng viên…
          </div>
        ) : isError || !item ? (
          <div className="rcd-empty">
            <i className="ti ti-alert-circle" />
            <p>Không tìm thấy hồ sơ ứng viên này.</p>
            <button type="button" className="rcd-btn-primary" onClick={() => navigate('/recruiter/candidates')}>
              Về danh sách vị trí
            </button>
          </div>
        ) : (
          <>
            <div className="rcd-header-card">
              <div className="rcd-avatar">
                {item.candidate.avatarUrl ? (
                  <img src={item.candidate.avatarUrl} alt={item.candidate.fullName} />
                ) : (
                  getInitials(item.candidate.fullName)
                )}
              </div>
              <div className="rcd-header-info">
                <h1 className="rcd-name">{item.candidate.fullName}</h1>
                <div className="rcd-meta"><i className="ti ti-mail" /> {item.candidate.email}</div>
                {item.candidate.phone && (
                  <div className="rcd-meta"><i className="ti ti-phone" /> {item.candidate.phone}</div>
                )}
                <div className="rcd-job-row">
                  <span className="rcd-job-title">{item.job.title}</span>
                  <span className={`badge badge-${STATUS_BADGE_CLASS[item.status]}`}>
                    {STATUS_LABELS[item.status]}
                  </span>
                </div>
              </div>
              <div className="rcd-header-actions">
                {item.matching && (
                  <div className="rcd-score">
                    <div className="rcd-score-num">{Math.round(item.matching.overallScore)}</div>
                    <div className="rcd-score-lbl">Điểm phù hợp</div>
                  </div>
                )}
                {item.cvFileUrl ? (
                  <a
                    className="rcd-btn-primary"
                    href={item.cvFileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <i className="ti ti-file-text" /> Mở file CV
                  </a>
                ) : (
                  <button type="button" className="rcd-btn-primary" disabled>
                    <i className="ti ti-file-off" /> Chưa có file CV
                  </button>
                )}
              </div>
            </div>

            <div className="rcd-grid">
              <section className="rcd-card">
                <h2 className="rcd-card-title"><i className="ti ti-sparkles" /> Tóm tắt AI</h2>
                {item.isParsed && item.parsedData?.summary ? (
                  <p className="rcd-body">{item.parsedData.summary}</p>
                ) : (
                  <p className="rcd-muted">
                    {item.isParsed ? 'Chưa có tóm tắt.' : 'CV đang được AI xử lý…'}
                  </p>
                )}
              </section>

              <section className="rcd-card">
                <h2 className="rcd-card-title"><i className="ti ti-code" /> Kỹ năng trích xuất</h2>
                {item.isParsed && item.parsedData && item.parsedData.skills.length > 0 ? (
                  <div className="rcd-skills">
                    {item.parsedData.skills.map((skill) => (
                      <span key={skill} className="rcd-skill">{skill}</span>
                    ))}
                  </div>
                ) : (
                  <p className="rcd-muted">Chưa có kỹ năng trích xuất.</p>
                )}
              </section>

              <section className="rcd-card rcd-card--full">
                <h2 className="rcd-card-title"><i className="ti ti-briefcase" /> Kinh nghiệm</h2>
                {item.isParsed && item.parsedData && item.parsedData.experience.length > 0 ? (
                  <ul className="rcd-list">
                    {item.parsedData.experience.map((exp, i) => (
                      <li key={i}>
                        <div className="rcd-list-title">{exp.title} — {exp.company}</div>
                        <div className="rcd-muted">{exp.period}</div>
                        {exp.description && <p className="rcd-body">{exp.description}</p>}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="rcd-muted">Chưa có thông tin kinh nghiệm.</p>
                )}
              </section>

              <section className="rcd-card rcd-card--full">
                <h2 className="rcd-card-title"><i className="ti ti-school" /> Học vấn</h2>
                {item.isParsed && item.parsedData && item.parsedData.education.length > 0 ? (
                  <ul className="rcd-list">
                    {item.parsedData.education.map((edu, i) => (
                      <li key={i}>
                        <div className="rcd-list-title">{edu.degree} — {edu.school}</div>
                        <div className="rcd-muted">{edu.year}</div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="rcd-muted">Chưa có thông tin học vấn.</p>
                )}
              </section>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  )
}
