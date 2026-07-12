import type { ScoreBand } from '../../api/rankings'

export interface PodiumItem {
  applicationId: string
  fullName: string
  avatarUrl: string | null
  overallScore: number
  scoreBand: ScoreBand | null
}

const RANK_MEDALS = ['🥇', '🥈', '🥉']

function getInitials(name: string): string {
  return name.split(' ').filter(Boolean).map((w) => w[0]).slice(0, 2).join('').toUpperCase()
}

interface Props {
  items: PodiumItem[]
  isLoading: boolean
}

export default function Top3Podium({ items, isLoading }: Props) {
  return (
    <div className="rk-panel-card">
      <div className="rk-panel-title"><i className="ti ti-trophy" /> Top 3 ứng viên</div>
      {isLoading ? (
        <div className="rk-panel-loading"><i className="ti ti-loader-2 rk-spin" /></div>
      ) : items.length === 0 ? (
        <div className="rk-panel-empty">Chưa có ứng viên nào được chấm điểm</div>
      ) : (
        <div className="rk-podium-list">
          {items.map((item, i) => (
            <div key={item.applicationId} className="rk-podium-item">
              <span className="rk-podium-medal">{RANK_MEDALS[i]}</span>
              <div className="rk-podium-avatar">
                {item.avatarUrl ? (
                  <img src={item.avatarUrl} alt={item.fullName} />
                ) : (
                  getInitials(item.fullName)
                )}
              </div>
              <div className="rk-podium-info">
                <div className="rk-podium-name">{item.fullName}</div>
                <span className={`rk-score-pill rk-band-${item.scoreBand}`}>
                  {Math.round(item.overallScore)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
