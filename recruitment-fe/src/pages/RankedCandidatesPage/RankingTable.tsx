import type { ApplicationStatus } from '../../api/candidates'
import type { JobApplicationListItem, ScoreBand } from '../../api/rankings'

export interface RankedRow extends JobApplicationListItem {
  rank: number
  skills: string[]
  scoreBand: ScoreBand | null
}

const STATUS_LABELS: Record<ApplicationStatus, string> = {
  pending: 'Vừa nộp đơn',
  matched: 'Đã chấm điểm',
  interviewed: 'Đã mời phỏng vấn',
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

const RANK_MEDALS = ['🥇', '🥈', '🥉']

function getInitials(name: string): string {
  return name.split(' ').filter(Boolean).map((w) => w[0]).slice(0, 2).join('').toUpperCase()
}

// Cho phép mời phỏng vấn / từ chối theo đúng VALID_TRANSITIONS ở
// packages/shared/scoring.constants.ts (FE chưa reference được package này).
function canInterview(status: ApplicationStatus): boolean {
  return status === 'matched'
}

function canReject(status: ApplicationStatus): boolean {
  return ['pending', 'matched', 'interviewed', 'completed'].includes(status)
}

function isSkillMatched(skill: string, requiredSkills: string[]): boolean {
  const normalized = skill.trim().toLowerCase()
  return requiredSkills.some((r) => r.trim().toLowerCase() === normalized)
}

interface Props {
  rows: RankedRow[]
  requiredSkills: string[]
  isLoading: boolean
  isError: boolean
  pendingApplicationId: string | null
  onSelectRow: (row: RankedRow) => void
  onAction: (row: RankedRow, action: 'interviewed' | 'rejected') => void
  onViewCv: (row: RankedRow) => void
}

export default function RankingTable({
  rows,
  requiredSkills,
  isLoading,
  isError,
  pendingApplicationId,
  onSelectRow,
  onAction,
  onViewCv,
}: Props) {
  return (
    <div className="rk-table-container">
      <table className="rk-table">
        <thead>
          <tr>
            <th className="rk-col-rank">Hạng</th>
            <th>Ứng viên</th>
            <th style={{ width: '24%' }}>Kỹ năng</th>
            <th style={{ width: '16%' }}>Điểm chi tiết</th>
            <th>Điểm số</th>
            <th>Trạng thái</th>
            <th>Hành động</th>
          </tr>
        </thead>
        <tbody>
          {isLoading ? (
            <tr>
              <td colSpan={7}>
                <div className="rk-empty-state">
                  <i className="ti ti-loader-2 rk-spin" />
                  <div>Đang tải danh sách xếp hạng…</div>
                </div>
              </td>
            </tr>
          ) : isError ? (
            <tr>
              <td colSpan={7}>
                <div className="rk-empty-state">
                  <i className="ti ti-alert-circle" />
                  <div>Không tải được danh sách ứng viên. Vui lòng thử lại.</div>
                </div>
              </td>
            </tr>
          ) : rows.length === 0 ? (
            <tr>
              <td colSpan={7}>
                <div className="rk-empty-state">
                  <div className="rk-empty-icon"><i className="ti ti-mood-empty" /></div>
                  <div>Chưa có ứng viên nào được chấm điểm ở nhóm này</div>
                </div>
              </td>
            </tr>
          ) : (
            rows.map((row) => {
              const isTerminalPending = pendingApplicationId === row.applicationId
              return (
                <tr
                  key={row.applicationId}
                  className="rk-row"
                  onClick={() => onSelectRow(row)}
                >
                  <td className="rk-col-rank">
                    <span className="rk-rank-badge">
                      {row.rank <= 3 ? RANK_MEDALS[row.rank - 1] : `#${row.rank}`}
                    </span>
                  </td>
                  <td>
                    <div className="rk-cand-info">
                      <div className="rk-cand-avatar">
                        {row.candidate.avatarUrl ? (
                          <img src={row.candidate.avatarUrl} alt={row.candidate.fullName} />
                        ) : (
                          getInitials(row.candidate.fullName)
                        )}
                      </div>
                      <div>
                        <div className="rk-cand-name">{row.candidate.fullName}</div>
                        <div className="rk-cand-meta"><i className="ti ti-mail" /> {row.candidate.email}</div>
                      </div>
                    </div>
                  </td>
                  <td onClick={(e) => e.stopPropagation()}>
                    {row.skills.length > 0 ? (
                      <div className="rk-skills-wrap">
                        {row.skills.slice(0, 4).map((skill, i) => (
                          <span
                            key={i}
                            className={`rk-skill-tag${isSkillMatched(skill, requiredSkills) ? ' rk-skill-tag--match' : ''}`}
                          >
                            {skill}
                          </span>
                        ))}
                        {row.skills.length > 4 && (
                          <span className="rk-skill-tag more">+{row.skills.length - 4}</span>
                        )}
                      </div>
                    ) : (
                      <span className="rk-cand-meta">Chưa có kỹ năng trích xuất</span>
                    )}
                  </td>
                  <td>
                    {row.matching?.criteria ? (
                      <div className="rk-criteria">
                        <div className="rk-criteria-row">
                          <span>Kỹ năng</span>
                          <div className="rk-bar"><div className="rk-bar-fill rk-bar-skills" style={{ width: `${row.matching.criteria.skills}%` }} /></div>
                        </div>
                        <div className="rk-criteria-row">
                          <span>K.nghiệm</span>
                          <div className="rk-bar"><div className="rk-bar-fill rk-bar-exp" style={{ width: `${row.matching.criteria.experience}%` }} /></div>
                        </div>
                        <div className="rk-criteria-row">
                          <span>Học vấn</span>
                          <div className="rk-bar"><div className="rk-bar-fill rk-bar-edu" style={{ width: `${row.matching.criteria.education}%` }} /></div>
                        </div>
                      </div>
                    ) : (
                      <span className="rk-cand-meta">—</span>
                    )}
                  </td>
                  <td>
                    {row.matching?.overallScore != null ? (
                      <div className="rk-score-wrap">
                        <span className={`rk-score-pill rk-band-${row.scoreBand}`}>
                          {Math.round(row.matching.overallScore)}
                        </span>
                      </div>
                    ) : (
                      <span className="rk-cand-meta">Chưa có điểm</span>
                    )}
                  </td>
                  <td>
                    <span className={`badge badge-${STATUS_BADGE_CLASS[row.status]}`}>
                      {STATUS_LABELS[row.status]}
                    </span>
                  </td>
                  <td onClick={(e) => e.stopPropagation()}>
                    <div className="rk-actions">
                      <button
                        className="rk-btn-interview"
                        disabled={!canInterview(row.status) || isTerminalPending}
                        title={canInterview(row.status) ? 'Mời phỏng vấn' : 'Không thể mời phỏng vấn ở trạng thái hiện tại'}
                        onClick={() => onAction(row, 'interviewed')}
                      >
                        <i className="ti ti-calendar-event" /> Mời phỏng vấn
                      </button>
                      <button
                        className="rk-btn-reject"
                        disabled={!canReject(row.status) || isTerminalPending}
                        title={canReject(row.status) ? 'Từ chối' : 'Không thể từ chối ở trạng thái hiện tại'}
                        onClick={() => onAction(row, 'rejected')}
                      >
                        <i className="ti ti-x" /> Từ chối
                      </button>
                      {/* Nút chevron cũ — xem chi tiết CV & báo cáo */}
                      <button
                        className="rk-btn-view-cv"
                        title="Xem chi tiết CV & Báo cáo"
                        onClick={() => onViewCv(row)}
                      >
                        <i className="ti ti-chevron-right" />
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })
          )}
        </tbody>
      </table>
    </div>
  )
}
