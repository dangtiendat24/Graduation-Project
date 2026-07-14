import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import CandidateLayout from '../../layouts/CandidateLayout/CandidateLayout'
import { getActiveJobs, type Job, type JobSearchParams } from '../../api/jobs'
import './CandidateJobsPage.css'

type WorkModel = 'onsite' | 'hybrid' | 'remote'
type Level = 'intern' | 'junior' | 'middle' | 'senior' | 'lead' | 'director'

const WORK_MODEL_LABELS: Record<WorkModel, string> = {
  onsite: 'Tại văn phòng',
  hybrid: 'Hybrid',
  remote: 'Remote',
}

const LEVEL_LABELS: Record<Level, string> = {
  intern: 'Thực tập sinh',
  junior: 'Junior',
  middle: 'Middle',
  senior: 'Senior',
  lead: 'Lead',
  director: 'Director',
}

const QUICK_CHIPS = ['Backend Developer', 'UI/UX Designer', 'Data Analyst', 'DevOps', 'React']

function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
}

export default function CandidateJobsPage() {
  const navigate = useNavigate()
  const [inputQuery, setInputQuery] = useState('')
  const [inputLocation, setInputLocation] = useState('')
  const [activeQuery, setActiveQuery] = useState('')
  const [activeLocation, setActiveLocation] = useState('')
  const [workModelFilter, setWorkModelFilter] = useState<WorkModel | null>(null)
  const [levelFilter, setLevelFilter] = useState<Level | null>(null)

  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function fetchJobs() {
      setLoading(true)
      setError(null)
      try {
        const params: JobSearchParams = {}
        if (activeQuery) params.q = activeQuery
        if (activeLocation) params.location = activeLocation
        if (workModelFilter) params.workModel = workModelFilter
        if (levelFilter) params.level = levelFilter
        const data = await getActiveJobs(params)
        if (!cancelled) setJobs(data)
      } catch {
        if (!cancelled) setError('Không thể tải danh sách việc làm. Vui lòng thử lại.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchJobs()

    // Refetch khi user switch lại tab — đảm bảo company name/avatar mới nhất
    const handleVisible = () => { if (document.visibilityState === 'visible') fetchJobs() }
    document.addEventListener('visibilitychange', handleVisible)

    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', handleVisible)
    }
  }, [activeQuery, activeLocation, workModelFilter, levelFilter])

  function handleSearch() {
    setActiveQuery(inputQuery.trim())
    setActiveLocation(inputLocation.trim())
  }

  function handleChipClick(chip: string) {
    setInputQuery(chip)
    setActiveQuery(chip)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') handleSearch()
  }

  function toggleWorkModel(value: WorkModel) {
    setWorkModelFilter((prev) => (prev === value ? null : value))
  }

  function toggleLevel(value: Level) {
    setLevelFilter((prev) => (prev === value ? null : value))
  }

  function resetFilters() {
    setWorkModelFilter(null)
    setLevelFilter(null)
    setInputQuery('')
    setInputLocation('')
    setActiveQuery('')
    setActiveLocation('')
  }

  return (
    <CandidateLayout>
      {/* ── Hero / Search ── */}
      <div className="cj-hero">
        <div className="cj-hero-inner">
          <h1>Tìm công việc phù hợp với bạn</h1>
          <p>Tìm kiếm theo tên công việc, kỹ năng hoặc địa điểm</p>

          <div className="cj-search-bar">
            <div className="cj-search-field">
              <i className="ti ti-search" />
              <input
                type="text"
                placeholder="Tên công việc, kỹ năng..."
                value={inputQuery}
                onChange={(e) => setInputQuery(e.target.value)}
                onKeyDown={handleKeyDown}
              />
            </div>
            <div className="cj-search-field divider">
              <i className="ti ti-map-pin" />
              <input
                type="text"
                placeholder="Địa điểm"
                value={inputLocation}
                onChange={(e) => setInputLocation(e.target.value)}
                onKeyDown={handleKeyDown}
              />
            </div>
            <button className="cj-btn-search" onClick={handleSearch}>
              Tìm kiếm
            </button>
          </div>

          <div className="cj-chip-row">
            {QUICK_CHIPS.map((chip) => (
              <span key={chip} className="cj-chip" onClick={() => handleChipClick(chip)}>
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

          <div className="cj-filter-group">
            <div className="cj-filter-label">Hình thức làm việc</div>
            {(Object.entries(WORK_MODEL_LABELS) as [WorkModel, string][]).map(([value, label]) => (
              <label key={value} className="cj-filter-option">
                <input
                  type="checkbox"
                  checked={workModelFilter === value}
                  onChange={() => toggleWorkModel(value)}
                />
                {label}
              </label>
            ))}
          </div>

          <div className="cj-filter-group">
            <div className="cj-filter-label">Cấp độ</div>
            {(Object.entries(LEVEL_LABELS) as [Level, string][]).map(([value, label]) => (
              <label key={value} className="cj-filter-option">
                <input
                  type="checkbox"
                  checked={levelFilter === value}
                  onChange={() => toggleLevel(value)}
                />
                {label}
              </label>
            ))}
          </div>

          <button className="cj-filter-reset" onClick={resetFilters}>
            Xóa bộ lọc
          </button>
        </div>

        {/* Job results */}
        <div>
          <div className="cj-results-head">
            <h2>
              Việc làm đang tuyển{' '}
              <span className="cj-count">
                {loading ? '' : `(${jobs.length} kết quả)`}
              </span>
            </h2>
          </div>

          {loading && (
            <div className="cj-state-msg">Đang tải danh sách việc làm...</div>
          )}

          {!loading && error && (
            <div className="cj-state-msg cj-state-error">{error}</div>
          )}

          {!loading && !error && jobs.length === 0 && (
            <div className="cj-state-msg">
              Không tìm thấy tin tuyển dụng phù hợp. Hãy thử thay đổi từ khóa hoặc bộ lọc.
            </div>
          )}

          {!loading && !error && jobs.map((job) => {
            const companyName = job.company?.name ?? 'Công ty chưa cập nhật'
            const initials = getInitials(companyName)
            const workModelLabel = job.workModel ? WORK_MODEL_LABELS[job.workModel] : null
            const levelLabel = job.level ? LEVEL_LABELS[job.level] : null

            return (
              <div key={job.id} className="cj-job-card" onClick={() => navigate(`/candidate/jobs/${job.id}`)} style={{ cursor: 'pointer' }}>
                <div
                  className="cj-company-logo"
                  title={companyName}
                  onClick={(e) => { if (job.company?.id) { e.stopPropagation(); navigate(`/candidate/companies/${job.company.id}`) } }}
                  style={job.company?.id ? { cursor: 'pointer' } : undefined}
                >
                  {initials}
                </div>

                <div className="cj-job-main">
                  <div className="cj-job-top">
                    <div>
                      <div className="cj-job-title">{job.title}</div>
                      <div
                        className="cj-job-company"
                        onClick={(e) => { if (job.company?.id) { e.stopPropagation(); navigate(`/candidate/companies/${job.company.id}`) } }}
                        style={job.company?.id ? { cursor: 'pointer', textDecoration: 'underline dotted' } : undefined}
                      >
                        {companyName}
                      </div>
                    </div>
                    {job.deadline && (
                      <span className="cj-deadline-pill">
                        <i className="ti ti-calendar-due" />
                        HSD: {new Date(job.deadline).toLocaleDateString('vi-VN')}
                      </span>
                    )}
                  </div>

                  <div className="cj-job-meta">
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
                    <div className="cj-job-tags">
                      {job.requiredSkills.slice(0, 4).map((skill) => (
                        <span key={skill} className="cj-tag">{skill}</span>
                      ))}
                      {job.requiredSkills.length > 4 && (
                        <span className="cj-tag">+{job.requiredSkills.length - 4}</span>
                      )}
                    </div>
                  )}

                  <div className="cj-job-footer">
                    <span className="cj-job-salary">
                      {job.salaryRange ?? 'Thỏa thuận'}
                    </span>
                    <div className="cj-job-actions" onClick={(e) => e.stopPropagation()}>
                      <button className="cj-btn-save" title="Lưu tin">
                        <i className="ti ti-heart" />
                      </button>
                      <button className="cj-btn-apply" onClick={() => navigate(`/candidate/jobs/${job.id}`)}>Xem chi tiết</button>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </CandidateLayout>
  )
}
