import type { RankedRow } from './RankingTable'

interface Props {
  row: RankedRow
  requiredSkills: string[]
  onClose: () => void
}

function getInitials(name: string): string {
  return name.split(' ').filter(Boolean).map((w) => w[0]).slice(0, 2).join('').toUpperCase()
}

export default function CandidateDetailDrawer({ row, requiredSkills, onClose }: Props) {
  const normalizedRequired = requiredSkills.map((s) => s.trim().toLowerCase())
  const normalizedCandidate = new Set(row.skills.map((s) => s.trim().toLowerCase()))

  const matchedSkills = row.skills.filter((s) => normalizedRequired.includes(s.trim().toLowerCase()))
  const missingSkills = requiredSkills.filter((s) => !normalizedCandidate.has(s.trim().toLowerCase()))

  return (
    <div className="rk-overlay" onClick={onClose}>
      <div className="rk-drawer" onClick={(e) => e.stopPropagation()}>
        <button className="rk-drawer-close" onClick={onClose} aria-label="Đóng">
          <i className="ti ti-x" />
        </button>

        <div className="rk-drawer-head">
          <div className="rk-drawer-avatar">
            {row.candidate.avatarUrl ? (
              <img src={row.candidate.avatarUrl} alt={row.candidate.fullName} />
            ) : (
              getInitials(row.candidate.fullName)
            )}
          </div>
          <div>
            <div className="rk-drawer-name">{row.candidate.fullName}</div>
            <div className="rk-cand-meta"><i className="ti ti-mail" /> {row.candidate.email}</div>
            {row.candidate.phone && (
              <div className="rk-cand-meta"><i className="ti ti-phone" /> {row.candidate.phone}</div>
            )}
          </div>
          {row.matching?.overallScore != null && (
            <span className={`rk-score-pill rk-score-pill--lg rk-band-${row.scoreBand}`}>
              {Math.round(row.matching.overallScore)}
            </span>
          )}
        </div>

        {row.matching?.criteria && (
          <div className="rk-drawer-section">
            <div className="rk-drawer-section-title">Điểm chi tiết theo tiêu chí</div>
            <div className="rk-criteria rk-criteria--lg">
              <div className="rk-criteria-row">
                <span>Kỹ năng</span>
                <div className="rk-bar"><div className="rk-bar-fill rk-bar-skills" style={{ width: `${row.matching.criteria.skills}%` }} /></div>
                <span className="rk-criteria-val">{Math.round(row.matching.criteria.skills)}</span>
              </div>
              {row.matching.criteria.skillBreakdown && (
                <div className="rk-subcriteria">
                  <div className="rk-subcriteria-row">
                    <span>Từ khoá (keyword)</span>
                    <div className="rk-bar rk-bar--sm">
                      <div className="rk-bar-fill rk-bar-keyword" style={{ width: `${row.matching.criteria.skillBreakdown.keyword}%` }} />
                    </div>
                    <span className="rk-criteria-val">{Math.round(row.matching.criteria.skillBreakdown.keyword)}</span>
                  </div>
                  <div className="rk-subcriteria-row">
                    <span>TF-IDF</span>
                    <div className="rk-bar rk-bar--sm">
                      <div className="rk-bar-fill rk-bar-tfidf" style={{ width: `${row.matching.criteria.skillBreakdown.tfidf}%` }} />
                    </div>
                    <span className="rk-criteria-val">{Math.round(row.matching.criteria.skillBreakdown.tfidf)}</span>
                  </div>
                  <div className="rk-subcriteria-row">
                    <span>Ngữ nghĩa (AI)</span>
                    <div className="rk-bar rk-bar--sm">
                      <div className="rk-bar-fill rk-bar-semantic" style={{ width: `${row.matching.criteria.skillBreakdown.semantic}%` }} />
                    </div>
                    <span className="rk-criteria-val">{Math.round(row.matching.criteria.skillBreakdown.semantic)}</span>
                  </div>
                </div>
              )}
              <div className="rk-criteria-row">
                <span>Kinh nghiệm</span>
                <div className="rk-bar"><div className="rk-bar-fill rk-bar-exp" style={{ width: `${row.matching.criteria.experience}%` }} /></div>
                <span className="rk-criteria-val">{Math.round(row.matching.criteria.experience)}</span>
              </div>
              <div className="rk-criteria-row">
                <span>Học vấn</span>
                <div className="rk-bar"><div className="rk-bar-fill rk-bar-edu" style={{ width: `${row.matching.criteria.education}%` }} /></div>
                <span className="rk-criteria-val">{Math.round(row.matching.criteria.education)}</span>
              </div>
            </div>
          </div>
        )}

        {requiredSkills.length > 0 && (
          <div className="rk-drawer-section">
            <div className="rk-drawer-section-title">So khớp kỹ năng yêu cầu</div>
            <div className="rk-skill-compare">
              <div>
                <div className="rk-skill-compare-label rk-skill-compare-label--ok">
                  <i className="ti ti-circle-check" /> Đáp ứng ({matchedSkills.length})
                </div>
                <div className="rk-skills-wrap">
                  {matchedSkills.length > 0 ? matchedSkills.map((s, i) => (
                    <span key={i} className="rk-skill-tag rk-skill-tag--match">{s}</span>
                  )) : <span className="rk-cand-meta">Không có kỹ năng khớp</span>}
                </div>
              </div>
              <div>
                <div className="rk-skill-compare-label rk-skill-compare-label--missing">
                  <i className="ti ti-circle-x" /> Còn thiếu ({missingSkills.length})
                </div>
                <div className="rk-skills-wrap">
                  {missingSkills.length > 0 ? missingSkills.map((s, i) => (
                    <span key={i} className="rk-skill-tag rk-skill-tag--missing">{s}</span>
                  )) : <span className="rk-cand-meta">Đáp ứng đủ yêu cầu</span>}
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="rk-drawer-section">
          <div className="rk-drawer-section-title">Giải thích của AI</div>
          <p className="rk-explanation">
            {row.matching?.explanation ?? 'Chưa có giải thích cho ứng viên này.'}
          </p>
        </div>
      </div>
    </div>
  )
}
