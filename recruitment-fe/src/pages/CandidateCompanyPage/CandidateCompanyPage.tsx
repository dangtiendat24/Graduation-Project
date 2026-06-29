import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import CandidateLayout from '../../layouts/CandidateLayout/CandidateLayout'
import { getCompany, type CompanyData } from '../../api/companies'
import { getActiveJobs, type Job } from '../../api/jobs'
import './CandidateCompanyPage.css'

const TYPE_LABELS: Record<string, string> = {
  startup: 'Startup',
  tnhh: 'Công ty TNHH',
  co_phan: 'Công ty Cổ phần',
  fdi: 'Nước ngoài / FDI',
  tap_doan: 'Tập đoàn',
}

const MODEL_LABELS: Record<string, string> = {
  onsite: 'Tại văn phòng',
  hybrid: 'Hybrid',
  remote: 'Remote 100%',
}

const SIZE_LABELS: Record<string, string> = {
  '1-10': '1–10 nhân viên',
  '11-50': '11–50 nhân viên',
  '51-200': '51–200 nhân viên',
  '201-500': '201–500 nhân viên',
  '501-1000': '501–1000 nhân viên',
  '1000+': '1000+ nhân viên',
}

const LEVEL_LABELS: Record<string, string> = {
  intern: 'Thực tập sinh',
  junior: 'Junior',
  middle: 'Middle',
  senior: 'Senior',
  lead: 'Lead',
  director: 'Director',
}

const WORK_MODEL_LABELS: Record<string, string> = {
  onsite: 'Tại văn phòng',
  hybrid: 'Hybrid',
  remote: 'Remote',
}

function getInitials(name: string): string {
  return name.split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase()
}

export default function CandidateCompanyPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [company, setCompany] = useState<CompanyData | null>(null)
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    let cancelled = false

    async function load() {
      try {
        const [co, jobList] = await Promise.all([
          getCompany(id!),
          getActiveJobs({ companyId: id }),
        ])
        if (!cancelled) {
          setCompany(co)
          setJobs(jobList)
          setLoading(false)
        }
      } catch {
        if (!cancelled) {
          setError('Không tìm thấy thông tin công ty.')
          setLoading(false)
        }
      }
    }

    load()

    const handleVisible = () => { if (document.visibilityState === 'visible') load() }
    document.addEventListener('visibilitychange', handleVisible)

    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', handleVisible)
    }
  }, [id])

  if (loading) {
    return (
      <CandidateLayout>
        <div className="ccp-state">Đang tải thông tin công ty...</div>
      </CandidateLayout>
    )
  }

  if (error || !company) {
    return (
      <CandidateLayout>
        <div className="ccp-state ccp-state--error">
          <p>{error ?? 'Không tìm thấy thông tin công ty.'}</p>
          <button onClick={() => navigate(-1)}>← Quay lại</button>
        </div>
      </CandidateLayout>
    )
  }

  const initials = getInitials(company.name)

  return (
    <CandidateLayout>
      <div className="ccp-wrapper">

        {/* Cover */}
        <div className="ccp-cover">
          {company.coverUrl
            ? <img src={company.coverUrl} alt="cover" className="ccp-cover-img" />
            : <div className="ccp-cover-placeholder" />
          }
        </div>

        {/* Header */}
        <div className="ccp-head-card">
          <div className="ccp-logo">
            {company.logoUrl
              ? <img src={company.logoUrl} alt={company.name} />
              : initials
            }
          </div>

          <div className="ccp-head-info">
            <div className="ccp-name">{company.name}</div>
            {company.tagline && <div className="ccp-tagline">{company.tagline}</div>}
            <div className="ccp-meta">
              {company.industry && <span><i className="ti ti-briefcase" />{company.industry}</span>}
              {company.sizeRange && <span><i className="ti ti-users" />{SIZE_LABELS[company.sizeRange] ?? company.sizeRange}</span>}
              {company.city && <span><i className="ti ti-map-pin" />{company.city}</span>}
              {company.foundedYear && <span><i className="ti ti-calendar" />Thành lập {company.foundedYear}</span>}
              {company.website && (
                <span>
                  <i className="ti ti-globe" />
                  <a href={company.website} target="_blank" rel="noreferrer">
                    {company.website.replace(/^https?:\/\//, '')}
                  </a>
                </span>
              )}
            </div>
          </div>

          <div className="ccp-head-actions">
            <button className="ccp-btn-follow">
              <i className="ti ti-bell" /> Theo dõi công ty
            </button>
            <div className="ccp-social">
              {company.linkedinUrl && (
                <a className="ccp-social-btn" href={company.linkedinUrl} target="_blank" rel="noreferrer">
                  <i className="ti ti-brand-linkedin" style={{ color: '#0A66C2' }} />
                </a>
              )}
              {company.facebookUrl && (
                <a className="ccp-social-btn" href={company.facebookUrl} target="_blank" rel="noreferrer">
                  <i className="ti ti-brand-facebook" style={{ color: '#1877F2' }} />
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="ccp-body">

          {/* Left column */}
          <div className="ccp-left">
            {company.fullDesc && (
              <div className="ccp-section">
                <div className="ccp-sec-title"><i className="ti ti-info-circle" />Về chúng tôi</div>
                {company.fullDesc.split('\n\n').map((para, i) => (
                  <p key={i} className="ccp-text">{para}</p>
                ))}
              </div>
            )}

            {company.techStack && company.techStack.length > 0 && (
              <div className="ccp-section">
                <div className="ccp-sec-title"><i className="ti ti-code" />Công nghệ sử dụng</div>
                <div className="ccp-tags">
                  {company.techStack.map((t, i) => (
                    <span key={i} className="ccp-tech-tag">{t}</span>
                  ))}
                </div>
              </div>
            )}

            {company.perks && company.perks.length > 0 && (
              <div className="ccp-section">
                <div className="ccp-sec-title"><i className="ti ti-heart" />Phúc lợi nổi bật</div>
                <div className="ccp-perks">
                  {company.perks.map((perk, i) => (
                    <div key={i} className="ccp-perk">
                      <i className="ti ti-check ccp-perk-icon" />{perk}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Active jobs */}
            <div className="ccp-section">
              <div className="ccp-sec-title">
                <i className="ti ti-briefcase" />Việc làm đang tuyển
                {jobs.length > 0 && <span className="ccp-job-count">({jobs.length})</span>}
              </div>

              {jobs.length === 0 ? (
                <div className="ccp-jobs-empty">
                  <i className="ti ti-briefcase-off" />
                  <span>Hiện chưa có tin tuyển dụng nào.</span>
                </div>
              ) : (
                <div className="ccp-job-list">
                  {jobs.map(job => (
                    <div
                      key={job.id}
                      className="ccp-job-card"
                      onClick={() => navigate(`/candidate/jobs/${job.id}`)}
                    >
                      <div className="ccp-job-title">{job.title}</div>
                      <div className="ccp-job-meta">
                        {job.location && <span><i className="ti ti-map-pin" />{job.location}</span>}
                        {job.workModel && <span><i className="ti ti-briefcase" />{WORK_MODEL_LABELS[job.workModel]}</span>}
                        {job.level && <span><i className="ti ti-award" />{LEVEL_LABELS[job.level]}</span>}
                      </div>
                      {job.requiredSkills && job.requiredSkills.length > 0 && (
                        <div className="ccp-job-tags">
                          {job.requiredSkills.slice(0, 4).map(s => (
                            <span key={s} className="ccp-job-tag">{s}</span>
                          ))}
                          {job.requiredSkills.length > 4 && (
                            <span className="ccp-job-tag">+{job.requiredSkills.length - 4}</span>
                          )}
                        </div>
                      )}
                      <div className="ccp-job-salary">{job.salaryRange ?? 'Thỏa thuận'}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right sidebar */}
          <div className="ccp-right">
            <div className="ccp-sidebar-card">
              <div className="ccp-sec-title" style={{ marginBottom: 12 }}>
                <i className="ti ti-building" />Thông tin công ty
              </div>
              <div className="ccp-info-rows">
                {company.industry && (
                  <div className="ccp-info-row">
                    <i className="ti ti-briefcase" />
                    <div>
                      <div className="ccp-info-label">Ngành nghề</div>
                      <div>{company.industry}</div>
                    </div>
                  </div>
                )}
                {company.sizeRange && (
                  <div className="ccp-info-row">
                    <i className="ti ti-users" />
                    <div>
                      <div className="ccp-info-label">Quy mô</div>
                      <div>{SIZE_LABELS[company.sizeRange] ?? company.sizeRange}</div>
                    </div>
                  </div>
                )}
                {company.foundedYear && (
                  <div className="ccp-info-row">
                    <i className="ti ti-calendar" />
                    <div>
                      <div className="ccp-info-label">Thành lập</div>
                      <div>{company.foundedYear}</div>
                    </div>
                  </div>
                )}
                {company.companyType && (
                  <div className="ccp-info-row">
                    <i className="ti ti-building-bank" />
                    <div>
                      <div className="ccp-info-label">Loại hình</div>
                      <div>{TYPE_LABELS[company.companyType] ?? company.companyType}</div>
                    </div>
                  </div>
                )}
                {company.workModel && (
                  <div className="ccp-info-row">
                    <i className="ti ti-home" />
                    <div>
                      <div className="ccp-info-label">Mô hình</div>
                      <div>{MODEL_LABELS[company.workModel] ?? company.workModel}</div>
                    </div>
                  </div>
                )}
                {company.workLanguage && (
                  <div className="ccp-info-row">
                    <i className="ti ti-language" />
                    <div>
                      <div className="ccp-info-label">Ngôn ngữ</div>
                      <div>{company.workLanguage}</div>
                    </div>
                  </div>
                )}
                {company.address && (
                  <div className="ccp-info-row">
                    <i className="ti ti-map-pin" />
                    <div>
                      <div className="ccp-info-label">Địa chỉ</div>
                      <div>{company.address}</div>
                    </div>
                  </div>
                )}
                {company.website && (
                  <div className="ccp-info-row">
                    <i className="ti ti-globe" />
                    <div>
                      <div className="ccp-info-label">Website</div>
                      <div>
                        <a href={company.website} target="_blank" rel="noreferrer">
                          {company.website.replace(/^https?:\/\//, '')}
                        </a>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="ccp-sidebar-card ccp-follow-card">
              <div className="ccp-follow-title">Quan tâm đến công ty này?</div>
              <div className="ccp-follow-sub">Theo dõi để nhận thông báo về tin tuyển dụng mới nhất.</div>
              <button className="ccp-btn-follow-lg">
                <i className="ti ti-bell" /> Theo dõi công ty
              </button>
            </div>
          </div>
        </div>
      </div>
    </CandidateLayout>
  )
}
