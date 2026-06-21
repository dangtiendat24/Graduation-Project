import { useState } from 'react'
import CandidateLayout from '../../layouts/CandidateLayout/CandidateLayout'
import './CandidateJobsPage.css'

/* ── Types ── */
interface Job {
  initials: string
  title: string
  company: string
  matchPct: number
  matchClass: 'high' | 'mid'
  location: string
  workType: string
  experience: string
  tags: string[]
  salary: string
}

/* ── Static data ── */
const JOBS: Job[] = [
  {
    initials: 'TC',
    title: 'Senior Backend Engineer',
    company: 'TechCorp Vietnam',
    matchPct: 92,
    matchClass: 'high',
    location: 'Quận 1, TP.HCM',
    workType: 'Toàn thời gian',
    experience: '2–4 năm kinh nghiệm',
    tags: ['Node.js', 'PostgreSQL', 'Microservices'],
    salary: '25 – 35 triệu',
  },
  {
    initials: 'FN',
    title: 'Product Designer',
    company: 'Fintek Solutions',
    matchPct: 88,
    matchClass: 'high',
    location: 'Remote',
    workType: 'Toàn thời gian',
    experience: '1–3 năm kinh nghiệm',
    tags: ['Figma', 'Design System', 'UX Research'],
    salary: '20 – 28 triệu',
  },
  {
    initials: 'DV',
    title: 'Data Analyst',
    company: 'DataViet Group',
    matchPct: 67,
    matchClass: 'mid',
    location: 'Quận 7, TP.HCM',
    workType: 'Toàn thời gian',
    experience: '1–2 năm kinh nghiệm',
    tags: ['SQL', 'Power BI', 'Python'],
    salary: '15 – 22 triệu',
  },
]

const QUICK_CHIPS = ['Backend Developer', 'UI/UX Designer', 'Data Analyst', 'DevOps', 'Remote']

/* ── Filter state helpers ── */
interface FilterGroup {
  label: string
  options: { id: string; label: string; checked: boolean }[]
}

const INITIAL_FILTERS: FilterGroup[] = [
  {
    label: 'Mức lương',
    options: [
      { id: 'salary-below15', label: 'Dưới 15 triệu', checked: false },
      { id: 'salary-15-25',   label: '15 – 25 triệu', checked: true },
      { id: 'salary-25-40',   label: '25 – 40 triệu', checked: false },
      { id: 'salary-above40', label: 'Trên 40 triệu', checked: false },
    ],
  },
  {
    label: 'Hình thức',
    options: [
      { id: 'type-full',    label: 'Toàn thời gian', checked: true },
      { id: 'type-part',    label: 'Bán thời gian',  checked: false },
      { id: 'type-remote',  label: 'Remote',          checked: false },
      { id: 'type-hybrid',  label: 'Hybrid',          checked: false },
    ],
  },
  {
    label: 'Kinh nghiệm',
    options: [
      { id: 'exp-fresh', label: 'Mới tốt nghiệp', checked: false },
      { id: 'exp-1-3',   label: '1 – 3 năm',      checked: true },
      { id: 'exp-3-5',   label: '3 – 5 năm',      checked: false },
      { id: 'exp-5plus', label: 'Trên 5 năm',      checked: false },
    ],
  },
]

export default function CandidateJobsPage() {
  const [query, setQuery] = useState('')
  const [filters, setFilters] = useState<FilterGroup[]>(INITIAL_FILTERS)

  function toggleOption(groupIdx: number, optionId: string) {
    setFilters((prev) =>
      prev.map((g, gi) =>
        gi !== groupIdx
          ? g
          : {
              ...g,
              options: g.options.map((o) =>
                o.id === optionId ? { ...o, checked: !o.checked } : o
              ),
            }
      )
    )
  }

  function resetFilters() {
    setFilters(INITIAL_FILTERS.map((g) => ({
      ...g,
      options: g.options.map((o) => ({ ...o, checked: false })),
    })))
  }

  return (
    <CandidateLayout>
      {/* ── Hero / Search ── */}
      <div className="cj-hero">
        <div className="cj-hero-inner">
          <h1>Tìm công việc phù hợp với bạn</h1>
          <p>AI phân tích hồ sơ của bạn và gợi ý những vị trí có độ phù hợp cao nhất</p>

          <div className="cj-search-bar">
            <div className="cj-search-field">
              <i className="ti ti-search" />
              <input
                type="text"
                placeholder="Tên công việc, công ty hoặc kỹ năng"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <div className="cj-search-field divider">
              <i className="ti ti-map-pin" />
              Hồ Chí Minh
            </div>
            <button className="cj-btn-search">Tìm kiếm</button>
          </div>

          <div className="cj-chip-row">
            {QUICK_CHIPS.map((chip) => (
              <span
                key={chip}
                className="cj-chip"
                onClick={() => setQuery(chip)}
              >
                {chip}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ── Content: filters + results ── */}
      <div className="cj-content">
        {/* Filter sidebar */}
        <div className="cj-filters">
          <h3>Bộ lọc</h3>

          {filters.map((group, gi) => (
            <div key={group.label} className="cj-filter-group">
              <div className="cj-filter-label">{group.label}</div>
              {group.options.map((opt) => (
                <label key={opt.id} className="cj-filter-option">
                  <input
                    type="checkbox"
                    checked={opt.checked}
                    onChange={() => toggleOption(gi, opt.id)}
                  />
                  {opt.label}
                </label>
              ))}
            </div>
          ))}

          <button className="cj-filter-reset" onClick={resetFilters}>
            Xóa bộ lọc
          </button>
        </div>

        {/* Job results */}
        <div>
          <div className="cj-results-head">
            <h2>
              Việc làm gợi ý cho bạn{' '}
              <span className="cj-count">({JOBS.length} kết quả)</span>
            </h2>
            <span className="cj-sort-pill">Phù hợp nhất ▾</span>
          </div>

          {JOBS.map((job) => (
            <div key={job.title + job.company} className="cj-job-card">
              <div className="cj-company-logo">{job.initials}</div>

              <div className="cj-job-main">
                <div className="cj-job-top">
                  <div>
                    <div className="cj-job-title">{job.title}</div>
                    <div className="cj-job-company">{job.company}</div>
                  </div>
                  <span className={`cj-match-pill cj-match-${job.matchClass}`}>
                    <i className="ti ti-bolt" />
                    {job.matchPct}% phù hợp
                  </span>
                </div>

                <div className="cj-job-meta">
                  <span><i className="ti ti-map-pin" />{job.location}</span>
                  <span><i className="ti ti-briefcase" />{job.workType}</span>
                  <span><i className="ti ti-clock" />{job.experience}</span>
                </div>

                <div className="cj-job-tags">
                  {job.tags.map((tag) => (
                    <span key={tag} className="cj-tag">{tag}</span>
                  ))}
                </div>

                <div className="cj-job-footer">
                  <span className="cj-job-salary">{job.salary}</span>
                  <div className="cj-job-actions">
                    <button className="cj-btn-save" title="Lưu tin">
                      <i className="ti ti-heart" />
                    </button>
                    <button className="cj-btn-apply">Ứng tuyển ngay</button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </CandidateLayout>
  )
}
