import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import CandidateLayout from '../../layouts/CandidateLayout/CandidateLayout'
import { getActiveJobs, type Job, type JobSearchParams } from '../../api/jobs'
import { getSavedJobIds, saveJob, unsaveJob } from '../../api/savedJobs'
import JobCard from '../../components/JobCard/JobCard'
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

export default function CandidateJobsPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { data: savedJobIds = [] } = useQuery({
    queryKey: ['saved-jobs', 'ids'],
    queryFn: getSavedJobIds,
  })
  const savedJobIdSet = useMemo(() => new Set(savedJobIds), [savedJobIds])

  const toggleSaveMutation = useMutation({
    mutationFn: ({ jobId, wasSaved }: { jobId: string; wasSaved: boolean }) =>
      wasSaved ? unsaveJob(jobId) : saveJob(jobId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saved-jobs'] })
    },
  })

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

          {!loading && !error && jobs.map((job) => (
            <JobCard
              key={job.id}
              job={job}
              isSaved={savedJobIdSet.has(job.id)}
              saveDisabled={toggleSaveMutation.isPending && toggleSaveMutation.variables?.jobId === job.id}
              onOpen={() => navigate(`/candidate/jobs/${job.id}`)}
              onOpenCompany={() => job.company?.id && navigate(`/candidate/companies/${job.company.id}`)}
              onToggleSave={() => toggleSaveMutation.mutate({ jobId: job.id, wasSaved: savedJobIdSet.has(job.id) })}
            />
          ))}
        </div>
      </div>
    </CandidateLayout>
  )
}
