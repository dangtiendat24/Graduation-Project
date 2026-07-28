import { useQuery } from '@tanstack/react-query'
import { getApplicationInterviewResult, getScoreBand } from '../../api/rankings'
import type { RankedRow } from './RankingTable'

interface Props {
  row: RankedRow
  jobId: string
  onClose: () => void
}

const CATEGORY_LABEL: Record<string, string> = {
  technical: 'Kỹ thuật',
  situational: 'Tình huống',
  behavioral: 'Kinh nghiệm',
}

const DIFFICULTY_LABEL: Record<string, string> = {
  easy: 'Cơ bản',
  medium: 'Trung bình',
  hard: 'Nâng cao',
}

const SUB_SCORE_ROWS: { key: 'relevance' | 'clarity' | 'depth' | 'correctness'; label: string; barClass: string }[] = [
  { key: 'relevance', label: 'Bám sát câu hỏi', barClass: 'rk-bar-skills' },
  { key: 'clarity', label: 'Rõ ràng, mạch lạc', barClass: 'rk-bar-exp' },
  { key: 'depth', label: 'Chiều sâu, ví dụ cụ thể', barClass: 'rk-bar-edu' },
  { key: 'correctness', label: 'Chính xác kỹ thuật', barClass: 'rk-bar-tfidf' },
]

function getInitials(name: string): string {
  return name.split(' ').filter(Boolean).map((w) => w[0]).slice(0, 2).join('').toUpperCase()
}

export default function InterviewResultDrawer({ row, jobId, onClose }: Props) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['application-interview-result', jobId, row.applicationId],
    queryFn: () => getApplicationInterviewResult(jobId, row.applicationId),
  })

  const band = data?.overallScore != null ? getScoreBand(data.overallScore) : null

  return (
    <div className="rk-overlay" onClick={onClose}>
      <div className="rk-drawer rk-drawer--wide" onClick={(e) => e.stopPropagation()}>
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
            <div className="rk-cand-meta">Kết quả phỏng vấn AI</div>
          </div>
          {data?.overallScore != null && (
            <span className={`rk-score-pill rk-score-pill--lg rk-band-${band}`}>
              {Math.round(data.overallScore)}
            </span>
          )}
        </div>

        {isLoading && (
          <div className="rk-empty-state">
            <i className="ti ti-loader-2 rk-spin" />
            <div>Đang tải kết quả phỏng vấn…</div>
          </div>
        )}

        {isError && (
          <div className="rk-empty-state">
            <i className="ti ti-alert-circle" />
            <div>Không tải được kết quả phỏng vấn. Vui lòng thử lại.</div>
          </div>
        )}

        {data && (
          <>
            {data.scoringStatus !== 'done' && (
              <div
                className={`rk-qa-banner${data.scoringStatus === 'error' ? ' rk-qa-banner--error' : ''}`}
              >
                <i className={`ti ${data.scoringStatus === 'error' ? 'ti-alert-circle' : 'ti-loader-2 rk-spin'}`} />
                {data.scoringStatus === 'error'
                  ? `Chấm điểm thất bại: ${data.scoringError ?? 'lỗi không xác định'}`
                  : 'Hệ thống đang chấm điểm câu trả lời của ứng viên...'}
              </div>
            )}

            <div className="rk-drawer-section">
              <div className="rk-drawer-section-title">
                Câu hỏi &amp; câu trả lời ({data.answers.length})
              </div>

              <div className="rk-qa-list">
                {data.answers.map((a, i) => (
                  <div key={a.questionId} className="rk-qa-card">
                    <div className="rk-qa-card-top">
                      <span className={`rk-qa-tag rk-qa-tag--${a.category}`}>
                        {CATEGORY_LABEL[a.category] ?? a.category}
                      </span>
                      <span className={`rk-qa-diff rk-qa-diff--${a.difficulty}`}>
                        <span className="rk-qa-diff-dot" />
                        {DIFFICULTY_LABEL[a.difficulty] ?? a.difficulty}
                      </span>
                      {a.totalScore != null && (
                        <span className="rk-qa-total">{Math.round(a.totalScore)}/100</span>
                      )}
                    </div>

                    <div className="rk-qa-question">
                      {i + 1}. {a.questionText}
                    </div>
                    <div className="rk-qa-answer">
                      {a.answerText.trim() ? a.answerText : <em>Ứng viên không trả lời câu này</em>}
                    </div>

                    {a.subScores && (
                      <div className="rk-qa-subscores">
                        {SUB_SCORE_ROWS.map((s) => (
                          <div className="rk-criteria-row" key={s.key}>
                            <span>{s.label}</span>
                            <div className="rk-bar rk-bar--sm">
                              <div
                                className={`rk-bar-fill ${s.barClass}`}
                                style={{ width: `${(a.subScores![s.key] / 25) * 100}%` }}
                              />
                            </div>
                            <span className="rk-criteria-val">{a.subScores![s.key]}/25</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {a.comment && (
                      <div className="rk-qa-comment">
                        <i className="ti ti-message-2" />
                        {a.comment}
                      </div>
                    )}
                  </div>
                ))}

                {data.answers.length === 0 && (
                  <div className="rk-cand-meta">Ứng viên chưa nộp câu trả lời nào.</div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
