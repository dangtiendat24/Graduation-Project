export interface ScoreDistribution {
  high: number
  medium: number
  low: number
  unscored: number
}

interface Props {
  avgScore: number | null
  maxScore: number | null
  distribution: ScoreDistribution
}

const SEGMENT_COLORS: Record<keyof ScoreDistribution, string> = {
  high: 'var(--color-teal)',
  medium: 'var(--color-amber)',
  low: 'var(--color-danger)',
  unscored: 'var(--border-emphasis)',
}

const SEGMENT_LABELS: Record<keyof ScoreDistribution, string> = {
  high: 'Rất phù hợp',
  medium: 'Phù hợp',
  low: 'Chưa phù hợp',
  unscored: 'Chưa chấm điểm',
}

const RADIUS = 40
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

export default function ScoreSummaryCard({ avgScore, maxScore, distribution }: Props) {
  const total = distribution.high + distribution.medium + distribution.low + distribution.unscored
  const keys: (keyof ScoreDistribution)[] = ['high', 'medium', 'low', 'unscored']

  let offset = 0
  const segments = total > 0
    ? keys
        .filter((k) => distribution[k] > 0)
        .map((k) => {
          const fraction = distribution[k] / total
          const dash = fraction * CIRCUMFERENCE
          const seg = {
            key: k,
            dasharray: `${dash} ${CIRCUMFERENCE - dash}`,
            dashoffset: -offset,
            color: SEGMENT_COLORS[k],
          }
          offset += dash
          return seg
        })
    : []

  return (
    <div className="rk-panel-card">
      <div className="rk-panel-title"><i className="ti ti-chart-donut" /> Tổng quan điểm số</div>

      <div className="rk-donut-wrap">
        <svg viewBox="0 0 100 100" className="rk-donut">
          <circle cx="50" cy="50" r={RADIUS} className="rk-donut-track" />
          {segments.map((seg) => (
            <circle
              key={seg.key}
              cx="50"
              cy="50"
              r={RADIUS}
              fill="none"
              stroke={seg.color}
              strokeWidth="14"
              strokeDasharray={seg.dasharray}
              strokeDashoffset={seg.dashoffset}
              transform="rotate(-90 50 50)"
            />
          ))}
        </svg>
        <div className="rk-donut-center">
          <div className="rk-donut-total">{total}</div>
          <div className="rk-donut-label">ứng viên</div>
        </div>
      </div>

      <div className="rk-donut-legend">
        {keys.map((k) => (
          <div key={k} className="rk-legend-item">
            <span className="rk-legend-dot" style={{ background: SEGMENT_COLORS[k] }} />
            <span className="rk-legend-label">{SEGMENT_LABELS[k]}</span>
            <span className="rk-legend-count">{distribution[k]}</span>
          </div>
        ))}
      </div>

      <div className="rk-stat-rows">
        <div className="rk-stat-row">
          <span>Điểm trung bình</span>
          <strong>{avgScore != null ? Math.round(avgScore) : '—'}</strong>
        </div>
        <div className="rk-stat-row">
          <span>Điểm cao nhất</span>
          <strong>{maxScore != null ? Math.round(maxScore) : '—'}</strong>
        </div>
      </div>
    </div>
  )
}
