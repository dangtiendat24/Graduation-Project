import type { Job } from '../../api/jobs'
import './JobCard.css'

const WORK_MODEL_LABELS: Record<string, string> = {
  onsite: 'Tại văn phòng',
  hybrid: 'Hybrid',
  remote: 'Remote',
}

const LEVEL_LABELS: Record<string, string> = {
  intern: 'Thực tập sinh',
  junior: 'Junior',
  middle: 'Middle',
  senior: 'Senior',
  lead: 'Lead',
  director: 'Director',
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
}

/**
 * Nhãn cho tin không còn nhận hồ sơ. Trang tìm việc chỉ trả tin 'active' nên nhãn này thực tế
 * chỉ xuất hiện ở "Việc làm đã lưu" — nơi tin ứng viên lưu từ trước có thể đã hết hạn hoặc bị
 * recruiter đóng. 'draft' không bao giờ lộ ra phía ứng viên nên không cần nhãn.
 */
const CLOSED_STATUS_LABELS: Partial<Record<Job['status'], string>> = {
  expired: 'Hết hạn',
  closed: 'Đã đóng',
}

interface JobCardProps {
  job: Job
  isSaved: boolean
  saveDisabled?: boolean
  onOpen: () => void
  onOpenCompany: () => void
  onToggleSave: () => void
}

/** Card tin tuyển dụng dùng chung cho danh sách "Việc làm" và "Việc làm đã lưu". */
export default function JobCard({ job, isSaved, saveDisabled, onOpen, onOpenCompany, onToggleSave }: JobCardProps) {
  const companyName = job.company?.name ?? 'Công ty chưa cập nhật'
  const initials = getInitials(companyName)
  const workModelLabel = job.workModel ? WORK_MODEL_LABELS[job.workModel] : null
  const levelLabel = job.level ? LEVEL_LABELS[job.level] : null
  const closedLabel = CLOSED_STATUS_LABELS[job.status]

  function handleOpenCompany(e: React.MouseEvent) {
    if (!job.company?.id) return
    e.stopPropagation()
    onOpenCompany()
  }

  return (
    <div
      className={`jcard-card${closedLabel ? ' jcard-card--closed' : ''}`}
      onClick={onOpen}
      style={{ cursor: 'pointer' }}
    >
      <div
        className="jcard-company-logo"
        title={companyName}
        onClick={handleOpenCompany}
        style={job.company?.id ? { cursor: 'pointer' } : undefined}
      >
        {initials}
      </div>

      <div className="jcard-main">
        <div className="jcard-top">
          <div>
            <div className="jcard-title">
              {job.title}
              {closedLabel && (
                <span className={`jcard-status-tag jcard-status-tag--${job.status}`}>{closedLabel}</span>
              )}
            </div>
            <div
              className="jcard-company"
              onClick={handleOpenCompany}
              style={job.company?.id ? { cursor: 'pointer', textDecoration: 'underline dotted' } : undefined}
            >
              {companyName}
            </div>
          </div>
          {job.deadline && (
            <span className="jcard-deadline-pill">
              <i className="ti ti-calendar-due" />
              HSD: {new Date(job.deadline).toLocaleDateString('vi-VN')}
            </span>
          )}
        </div>

        <div className="jcard-meta">
          {job.location && (
            <span><i className="ti ti-map-pin" />{job.location}</span>
          )}
          {workModelLabel && (
            <span><i className="ti ti-briefcase" />{workModelLabel}</span>
          )}
          {levelLabel && (
            <span><i className="ti ti-award" />{levelLabel}</span>
          )}
          {job.minExperience && (
            <span><i className="ti ti-clock" />{job.minExperience} năm kinh nghiệm</span>
          )}
        </div>

        {job.requiredSkills && job.requiredSkills.length > 0 && (
          <div className="jcard-tags">
            {job.requiredSkills.slice(0, 4).map((skill) => (
              <span key={skill} className="jcard-tag">{skill}</span>
            ))}
            {job.requiredSkills.length > 4 && (
              <span className="jcard-tag">+{job.requiredSkills.length - 4}</span>
            )}
          </div>
        )}

        <div className="jcard-footer">
          <span className="jcard-salary">
            {job.salaryRange ?? 'Thỏa thuận'}
          </span>
          <div className="jcard-actions" onClick={(e) => e.stopPropagation()}>
            <button
              className={`jcard-btn-save${isSaved ? ' jcard-btn-save--active' : ''}`}
              title={isSaved ? 'Bỏ lưu tin' : 'Lưu tin'}
              disabled={saveDisabled}
              onClick={onToggleSave}
            >
              <i className={`ti ${isSaved ? 'ti-heart-filled' : 'ti-heart'}`} />
            </button>
            <button className="jcard-btn-apply" onClick={onOpen}>Xem chi tiết</button>
          </div>
        </div>
      </div>
    </div>
  )
}
