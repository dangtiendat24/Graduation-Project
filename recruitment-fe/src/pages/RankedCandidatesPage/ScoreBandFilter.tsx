import type { ScoreBand } from '../../api/rankings'

export type BandFilterValue = 'all' | ScoreBand

interface Props {
  value: BandFilterValue
  counts: { all: number; high: number; medium: number; low: number }
  onChange: (value: BandFilterValue) => void
}

const TABS: { value: BandFilterValue; label: string }[] = [
  { value: 'all', label: 'Tất cả' },
  { value: 'high', label: 'Rất phù hợp' },
  { value: 'medium', label: 'Phù hợp' },
  { value: 'low', label: 'Chưa phù hợp' },
]

export default function ScoreBandFilter({ value, counts, onChange }: Props) {
  return (
    <div className="rk-band-filter">
      {TABS.map((tab) => (
        <button
          key={tab.value}
          className={`rk-band-tab rk-band-tab--${tab.value}${value === tab.value ? ' active' : ''}`}
          onClick={() => onChange(tab.value)}
        >
          {tab.label}
          <span className="rk-band-count">{counts[tab.value]}</span>
        </button>
      ))}
    </div>
  )
}
