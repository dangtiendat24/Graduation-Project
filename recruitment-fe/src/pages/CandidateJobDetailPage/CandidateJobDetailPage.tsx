import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import CandidateLayout from '../../layouts/CandidateLayout/CandidateLayout'
import { getJob, type Job } from '../../api/jobs'
import { getApplicationStatus, applyToJob, type ApplicationStatus } from '../../api/applications'
import './CandidateJobDetailPage.css'

const WORK_MODEL_LABELS: Record<string, string> = {
  onsite: 'Tại văn phòng',
  hybrid: 'Hybrid',
  remote: 'Remote / Từ xa',
}

const LEVEL_LABELS: Record<string, string> = {
  intern: 'Thực tập sinh',
  junior: 'Junior',
  middle: 'Middle',
  senior: 'Senior',
  lead: 'Lead',
  director: 'Director',
}

const STATUS_LABELS: Record<ApplicationStatus, string> = {
  pending: 'Vừa nộp đơn',
  matched: 'Đã chấm điểm',
  interviewed: 'Đã phỏng vấn AI',
  schedule_sent: 'Chờ chọn lịch',
  scheduled: 'Đã hẹn lịch',
  completed: 'AI báo cáo',
  hired: 'Đã tuyển',
  rejected: 'Từ chối',
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
}

export default function CandidateJobDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [job, setJob] = useState<Job | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  /* apply flow */
  const [showApplyModal, setShowApplyModal] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { data: applicationStatus } = useQuery({
    queryKey: ['applications', 'status', id],
    queryFn: () => getApplicationStatus(id!),
    enabled: !!id,
  })

  const applyMutation = useMutation({
    mutationFn: (file: File) => applyToJob(id!, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['applications', 'status', id] })
      setShowApplyModal(false)
      setSelectedFile(null)
    },
  })

  function openApplyModal() {
    setSelectedFile(null)
    applyMutation.reset()
    setShowApplyModal(true)
  }

  function pickFile(file: File | undefined) {
    if (file) setSelectedFile(file)
  }

  function handleSubmitApply() {
    if (selectedFile) applyMutation.mutate(selectedFile)
  }

  useEffect(() => {
    if (!id) return
    let cancelled = false

    function fetchJob() {
      getJob(id!)
        .then((data) => { if (!cancelled) { setJob(data); setLoading(false) } })
        .catch(() => { if (!cancelled) { setError('Không tìm thấy tin tuyển dụng.'); setLoading(false) } })
    }

    fetchJob()

    const handleVisible = () => { if (document.visibilityState === 'visible') fetchJob() }
    document.addEventListener('visibilitychange', handleVisible)

    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', handleVisible)
    }
  }, [id])

  if (loading) {
    return (
      <CandidateLayout>
        <div className="cjd-loading">Đang tải thông tin...</div>
      </CandidateLayout>
    )
  }

  if (error || !job) {
    return (
      <CandidateLayout>
        <div className="cjd-error">
          <p>{error ?? 'Không tìm thấy tin tuyển dụng.'}</p>
          <button onClick={() => navigate('/candidate/jobs')}>← Quay lại danh sách</button>
        </div>
      </CandidateLayout>
    )
  }

  const companyName = job.company?.name ?? 'Công ty chưa cập nhật'
  const initials = getInitials(companyName)

  return (
    <CandidateLayout>
      <div className="cjd-wrapper">
        {/* Back link */}
        <button className="cjd-back" onClick={() => navigate('/candidate/jobs')}>
          <i className="ti ti-arrow-left" /> Quay lại danh sách việc làm
        </button>

        <div className="cjd-layout">
          {/* ── Main content ── */}
          <div className="cjd-main">
            {/* Header card */}
            <div className="cjd-header-card">
              <div
                className="cjd-company-logo"
                title={companyName}
                onClick={() => job.company?.id && navigate(`/candidate/companies/${job.company.id}`)}
                style={job.company?.id ? { cursor: 'pointer' } : undefined}
              >
                {initials}
              </div>
              <div className="cjd-header-info">
                <h1 className="cjd-title">{job.title}</h1>
                <div
                  className="cjd-company-name"
                  onClick={() => job.company?.id && navigate(`/candidate/companies/${job.company.id}`)}
                  style={job.company?.id ? { cursor: 'pointer', textDecoration: 'underline dotted' } : undefined}
                >
                  {companyName}
                </div>
                {job.company?.industry && (
                  <div className="cjd-industry">{job.company.industry}</div>
                )}
              </div>
            </div>

            {/* Meta badges */}
            <div className="cjd-meta-row">
              {job.location && (
                <span className="cjd-badge">
                  <i className="ti ti-map-pin" />{job.location}
                </span>
              )}
              {job.workModel && (
                <span className="cjd-badge">
                  <i className="ti ti-building" />{WORK_MODEL_LABELS[job.workModel]}
                </span>
              )}
              {job.level && (
                <span className="cjd-badge">
                  <i className="ti ti-award" />{LEVEL_LABELS[job.level]}
                </span>
              )}
              {job.minExperience && (
                <span className="cjd-badge">
                  <i className="ti ti-clock" />{job.minExperience} năm kinh nghiệm
                </span>
              )}
              {job.headcount > 1 && (
                <span className="cjd-badge">
                  <i className="ti ti-users" />Tuyển {job.headcount} người
                </span>
              )}
            </div>

            {/* Skills */}
            {job.requiredSkills && job.requiredSkills.length > 0 && (
              <div className="cjd-section">
                <h2 className="cjd-section-title">Kỹ năng yêu cầu</h2>
                <div className="cjd-skills">
                  {job.requiredSkills.map((skill) => (
                    <span key={skill} className="cjd-skill-tag">{skill}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Description */}
            <div className="cjd-section">
              <h2 className="cjd-section-title">Mô tả công việc</h2>
              <div className="cjd-text-body">{job.description}</div>
            </div>

            {/* Requirements */}
            <div className="cjd-section">
              <h2 className="cjd-section-title">Yêu cầu ứng viên</h2>
              <div className="cjd-text-body">{job.requirements}</div>
            </div>

            {/* Perks */}
            {job.jobPerks && job.jobPerks.length > 0 && (
              <div className="cjd-section">
                <h2 className="cjd-section-title">Phúc lợi</h2>
                <ul className="cjd-perks-list">
                  {job.jobPerks.map((perk) => (
                    <li key={perk}><i className="ti ti-check" />{perk}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* ── Sidebar ── */}
          <div className="cjd-sidebar">
            <div className="cjd-sidebar-card">
              <div className="cjd-salary">
                {job.salaryRange ?? 'Thỏa thuận'}
              </div>
              <div className="cjd-salary-label">Mức lương</div>

              {applicationStatus?.hasApplied ? (
                <button className="cjd-btn-apply cjd-btn-apply--done" disabled>
                  <i className="ti ti-circle-check" />
                  {applicationStatus.status ? STATUS_LABELS[applicationStatus.status] : 'Đã ứng tuyển'}
                </button>
              ) : (
                <button className="cjd-btn-apply" onClick={openApplyModal}>
                  <i className="ti ti-send" /> Ứng tuyển ngay
                </button>
              )}
              <button className="cjd-btn-save">
                <i className="ti ti-heart" /> Lưu tin
              </button>
            </div>

            <div className="cjd-sidebar-card">
              <div className="cjd-detail-title">Thông tin chung</div>
              <div className="cjd-detail-rows">
                {job.department && (
                  <div className="cjd-detail-row">
                    <span className="cjd-detail-label">Bộ phận</span>
                    <span>{job.department}</span>
                  </div>
                )}
                {job.level && (
                  <div className="cjd-detail-row">
                    <span className="cjd-detail-label">Cấp độ</span>
                    <span>{LEVEL_LABELS[job.level]}</span>
                  </div>
                )}
                {job.workModel && (
                  <div className="cjd-detail-row">
                    <span className="cjd-detail-label">Hình thức</span>
                    <span>{WORK_MODEL_LABELS[job.workModel]}</span>
                  </div>
                )}
                {job.minExperience && (
                  <div className="cjd-detail-row">
                    <span className="cjd-detail-label">Kinh nghiệm</span>
                    <span>{job.minExperience} năm</span>
                  </div>
                )}
                {job.deadline && (
                  <div className="cjd-detail-row">
                    <span className="cjd-detail-label">Hạn nộp HS</span>
                    <span>{new Date(job.deadline).toLocaleDateString('vi-VN')}</span>
                  </div>
                )}
                <div className="cjd-detail-row">
                  <span className="cjd-detail-label">Ngày đăng</span>
                  <span>{new Date(job.createdAt).toLocaleDateString('vi-VN')}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Apply modal */}
      {showApplyModal && (
        <div className="cjd-overlay" onClick={() => !applyMutation.isPending && setShowApplyModal(false)}>
          <div className="cjd-apply-modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="cjd-apply-modal-title">Ứng tuyển: {job.title}</h3>
            <p className="cjd-apply-modal-sub">Chọn CV (PDF hoặc DOCX, tối đa 5MB) để nộp cho tin tuyển dụng này.</p>

            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.doc,.docx"
              style={{ display: 'none' }}
              onChange={(e) => pickFile(e.target.files?.[0])}
            />

            <div
              className={`cjd-drop-zone${dragOver ? ' cjd-drop-zone--over' : ''}`}
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault()
                setDragOver(false)
                pickFile(e.dataTransfer.files?.[0])
              }}
            >
              <i className="ti ti-file-upload cjd-drop-icon" />
              {selectedFile ? (
                <div className="cjd-drop-title">{selectedFile.name}</div>
              ) : (
                <>
                  <div className="cjd-drop-title">Kéo thả file vào đây</div>
                  <div className="cjd-drop-sub">hoặc bấm để chọn file từ máy</div>
                </>
              )}
            </div>

            {applyMutation.isError && (
              <p className="cjd-apply-error">
                <i className="ti ti-alert-circle" />
                {(applyMutation.error as { response?: { data?: { message?: string } } })?.response?.data?.message
                  ?? 'Nộp đơn thất bại. Vui lòng thử lại.'}
              </p>
            )}

            <div className="cjd-apply-modal-actions">
              <button
                className="cjd-btn-save"
                disabled={applyMutation.isPending}
                onClick={() => setShowApplyModal(false)}
              >
                Huỷ
              </button>
              <button
                className="cjd-btn-apply"
                disabled={!selectedFile || applyMutation.isPending}
                onClick={handleSubmitApply}
              >
                {applyMutation.isPending ? 'Đang nộp...' : 'Nộp đơn ứng tuyển'}
              </button>
            </div>
          </div>
        </div>
      )}
    </CandidateLayout>
  )
}
