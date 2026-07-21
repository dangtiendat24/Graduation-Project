import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import CandidateLayout from '../../layouts/CandidateLayout/CandidateLayout'
import { useAuthStore } from '../../store/authStore'
import {
  getMyProfile,
  updateMyProfile,
  uploadCV,
  calcCompletionPct,
  calcCompletionItems,
  formatBytes,
  formatUploadDate,
  type ProfileData,
  type EduItem,
  type ExperienceItem,
} from '../../api/profile'
import { splitSummaryLines } from '../../utils/summary'
import './CandidateProfilePage.css'

/* ── helpers ── */
function getInitials(name: string): string {
  return name.split(' ').filter(Boolean).map((w) => w[0]).slice(0, 2).join('').toUpperCase()
}

/* ── form state shape ── */
interface ProfileForm {
  fullName: string
  phone: string
  city: string
  linkedin: string
  github: string
}

function profileToForm(p: ProfileData): ProfileForm {
  return {
    fullName: p.fullName ?? '',
    phone: p.phone ?? '',
    city: p.city ?? '',
    linkedin: p.linkedin ?? '',
    github: p.github ?? '',
  }
}

/* ── sub-components ── */
function ExperienceList({ items }: { items: ExperienceItem[] }) {
  return (
    <div className="cp-timeline">
      {items.map((exp, i) => (
        <div key={i} className="cp-tl-item">
          <div className="cp-tl-left">
            <div className={`cp-tl-dot${i === 0 ? ' cp-tl-dot-active' : ''}`} />
            {i < items.length - 1 && <div className="cp-tl-line" />}
          </div>
          <div className="cp-tl-body">
            <div className="cp-tl-title">{exp.title}</div>
            <div className="cp-tl-company">{exp.company}</div>
            <div className="cp-tl-period">{exp.period}</div>
            <div className="cp-tl-desc">{exp.description}</div>
          </div>
        </div>
      ))}
    </div>
  )
}

function EduList({ items }: { items: EduItem[] }) {
  return (
    <div className="cp-edu-list">
      {items.map((edu, i) => (
        <div key={i} className="cp-edu-item">
          <div className="cp-edu-icon"><i className="ti ti-school" /></div>
          <div>
            <div className="cp-edu-school">{edu.school}</div>
            <div className="cp-edu-degree">{edu.degree}</div>
            <div className="cp-edu-year">{edu.year}</div>
          </div>
        </div>
      ))}
    </div>
  )
}

/* ── main component ── */
export default function CandidateProfilePage() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const queryClient = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)

  /* form state */
  const [form, setForm] = useState<ProfileForm>({
    fullName: user?.fullName ?? '',
    phone: '',
    city: '',
    linkedin: '',
    github: '',
  })
  const [showDrop, setShowDrop] = useState(false)
  const [saveOk, setSaveOk] = useState(false)
  const [dragOver, setDragOver] = useState(false)

  /* fetch profile */
  const { data: profile, isLoading, isError } = useQuery({
    queryKey: ['profile', 'me'],
    queryFn: getMyProfile,
    staleTime: 30_000,
  })

  /* sync form when profile loads */
  useEffect(() => {
    if (profile) setForm(profileToForm(profile))
  }, [profile])

  /* update profile mutation */
  const updateMutation = useMutation({
    mutationFn: updateMyProfile,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile', 'me'] })
      setSaveOk(true)
      setTimeout(() => setSaveOk(false), 3000)
    },
  })

  /* CV upload mutation */
  const cvMutation = useMutation({
    mutationFn: uploadCV,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile', 'me'] })
      setShowDrop(false)
    },
  })

  function handleSave() {
    updateMutation.mutate({
      fullName: form.fullName || undefined,
      phone: form.phone || undefined,
      city: form.city || undefined,
      linkedin: form.linkedin || undefined,
      github: form.github || undefined,
    })
  }

  function handleReset() {
    if (profile) setForm(profileToForm(profile))
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) cvMutation.mutate(file)
    e.target.value = ''
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) cvMutation.mutate(file)
  }

  const initials = user ? getInitials(user.fullName) : 'U'
  const resume = profile?.resume ?? null

  // Tính completion từ form state hiện tại (live) thay vì từ server data
  const liveProfile = profile
    ? { ...profile, fullName: form.fullName, phone: form.phone, city: form.city, linkedin: form.linkedin, github: form.github }
    : null
  const completionPct = liveProfile ? calcCompletionPct(liveProfile) : 0
  const completionItems = liveProfile ? calcCompletionItems(liveProfile) : []

  /* ── render ── */
  if (isLoading) {
    return (
      <CandidateLayout>
        <div className="cp-loading">
          <span className="cp-spinner" />
          <span>Đang tải hồ sơ...</span>
        </div>
      </CandidateLayout>
    )
  }

  if (isError) {
    return (
      <CandidateLayout>
        <div className="cp-error-box">
          <i className="ti ti-alert-circle" />
          <span>Không thể tải hồ sơ. Vui lòng thử lại.</span>
          <button className="cp-btn-ghost" onClick={() => queryClient.invalidateQueries({ queryKey: ['profile', 'me'] })}>
            Thử lại
          </button>
        </div>
      </CandidateLayout>
    )
  }

  return (
    <CandidateLayout>

      {/* hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.doc,.docx"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />

      {/* ══ TWO-COLUMN LAYOUT ══ */}
      <div className="cp-layout">

        {/* ════ LEFT ════ */}
        <div className="cp-left">

          {/* Card: Thông tin cá nhân */}
          <div className="cp-card">
            <div className="cp-card-head">
              <div className="cp-ch-icon cp-chi-indigo"><i className="ti ti-user" /></div>
              <div>
                <div className="cp-card-title">Thông tin cá nhân</div>
                <div className="cp-card-sub">Họ tên, liên hệ và mạng xã hội</div>
              </div>
            </div>
            <div className="cp-card-body">

              {/* Avatar */}
              <div className="cp-avatar-section">
                <div className="cp-avatar-wrap">
                  {profile?.avatarUrl
                    ? <img src={profile.avatarUrl} alt="avatar" className="cp-avatar-img cp-avatar-photo" />
                    : <div className="cp-avatar-img">{initials}</div>
                  }
                  <div className="cp-avatar-cam"><i className="ti ti-camera" /></div>
                </div>
                <div className="cp-avatar-info">
                  <div className="cp-avatar-name">{profile?.fullName ?? user?.fullName}</div>
                  <div className="cp-avatar-email">{profile?.email ?? user?.email}</div>
                  <div className="cp-avatar-btns">
                    <button className="cp-btn-upload"><i className="ti ti-upload" /> Đổi ảnh</button>
                    <button className="cp-btn-rm">Xoá</button>
                  </div>
                </div>
              </div>

              {/* Fields */}
              <div className="cp-form-row">
                <div className="cp-form-group">
                  <label>Họ và tên <span className="cp-required">*</span></label>
                  <input
                    type="text"
                    value={form.fullName}
                    onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
                  />
                </div>
                <div className="cp-form-group">
                  <label>Email</label>
                  <input type="text" value={profile?.email ?? user?.email ?? ''} readOnly />
                  <div className="cp-field-hint">Email đăng ký không thể thay đổi</div>
                </div>
              </div>

              <div className="cp-form-row">
                <div className="cp-form-group">
                  <label>Số điện thoại</label>
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                    placeholder="VD: 0912 345 678"
                  />
                </div>
                <div className="cp-form-group">
                  <label>Thành phố</label>
                  <select
                    value={form.city}
                    onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
                  >
                    <option value="">-- Chọn thành phố --</option>
                    <option>Hà Nội</option>
                    <option>TP. Hồ Chí Minh</option>
                    <option>Đà Nẵng</option>
                    <option>Cần Thơ</option>
                    <option>Khác</option>
                  </select>
                </div>
              </div>

              <div className="cp-divider-label">Mạng xã hội nghề nghiệp</div>

              <div className="cp-form-group">
                <label>LinkedIn</label>
                <div className="cp-social-row">
                  <div className="cp-social-icon cp-si-li"><i className="ti ti-brand-linkedin" /></div>
                  <input
                    type="url"
                    value={form.linkedin}
                    onChange={(e) => setForm((f) => ({ ...f, linkedin: e.target.value }))}
                    placeholder="https://linkedin.com/in/…"
                  />
                </div>
              </div>

              <div className="cp-form-group">
                <label>GitHub / Portfolio</label>
                <div className="cp-social-row">
                  <div className="cp-social-icon cp-si-gh"><i className="ti ti-brand-github" /></div>
                  <input
                    type="url"
                    value={form.github}
                    onChange={(e) => setForm((f) => ({ ...f, github: e.target.value }))}
                    placeholder="https://github.com/… hoặc link portfolio"
                  />
                </div>
              </div>

            </div>
          </div>

          {/* Card: CV */}
          <div className="cp-card">
            <div className="cp-card-head">
              <div className="cp-ch-icon cp-chi-teal"><i className="ti ti-file-cv" /></div>
              <div>
                <div className="cp-card-title">CV của bạn</div>
                <div className="cp-card-sub">Tải lên CV để ứng tuyển và để AI phân tích hồ sơ</div>
              </div>
            </div>
            <div className="cp-card-body">

              {/* CV status — khi đã có CV */}
              {resume ? (
                <div className="cp-cv-status">
                  <div className="cp-cv-status-left">
                    <i className="ti ti-file-check cp-cv-status-icon" />
                    <div>
                      <div className="cp-cv-status-name">{resume.cvOriginalName}</div>
                      <div className="cp-cv-status-meta">
                        Tải lên {formatUploadDate(resume.createdAt)} · {formatBytes(resume.cvSizeBytes)}
                        {resume.isAnalyzed ? ' · Đã phân tích xong' : ' · Chờ phân tích'}
                      </div>
                    </div>
                  </div>
                  <div className="cp-cv-status-right">
                    {resume.isAnalyzed
                      ? <span className="cp-cv-badge"><i className="ti ti-check" /> Đã phân tích</span>
                      : <span className="cp-cv-badge cp-cv-badge-pending"><i className="ti ti-loader" /> Đang xử lý</span>
                    }
                    <button className="cp-btn-ghost cp-btn-sm" onClick={() => setShowDrop((v) => !v)}>
                      <i className="ti ti-upload" /> Cập nhật CV
                    </button>
                  </div>
                </div>
              ) : (
                /* Không có CV — hiển thị alert */
                <div className="cp-alert cp-alert-info">
                  <i className="ti ti-info-circle" />
                  <span>Bạn chưa tải lên CV. Hãy tải lên CV để ứng tuyển và để AI phân tích hồ sơ.</span>
                </div>
              )}

              {/* Drop zone — hiện khi toggle hoặc chưa có CV */}
              {(showDrop || !resume) && (
                <div
                  className={`cp-drop-zone${dragOver ? ' cp-drop-zone--over' : ''}`}
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                >
                  {cvMutation.isPending ? (
                    <>
                      <span className="cp-drop-icon cp-spinner-icon" />
                      <div className="cp-drop-title">Đang tải lên...</div>
                    </>
                  ) : (
                    <>
                      <i className="ti ti-cloud-upload cp-drop-icon" />
                      <div className="cp-drop-title">Kéo thả CV vào đây hoặc nhấn để chọn</div>
                      <div className="cp-drop-sub">Hỗ trợ PDF, DOCX · Tối đa 5 MB</div>
                      <button className="cp-drop-btn" type="button" onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click() }}>
                        <i className="ti ti-folder-open" /> Chọn file
                      </button>
                    </>
                  )}
                </div>
              )}

              {cvMutation.isError && (
                <div className="cp-alert cp-alert-danger">
                  <i className="ti ti-alert-circle" />
                  <span>Upload thất bại. Vui lòng kiểm tra file và thử lại.</span>
                </div>
              )}

              {/* Parsed data — khi CV đã phân tích */}
              {resume?.isAnalyzed && (
                <div className="cp-parse-section">
                  <div className="cp-parse-divider">Nội dung CV của bạn</div>

                  {resume.parsedSummary && (
                    <div className="cp-parse-block">
                      <div className="cp-parse-label"><i className="ti ti-quote cp-icon-indigo" /> Tóm tắt</div>
                      <ul className="cp-summary-box cp-summary-list">
                        {splitSummaryLines(resume.parsedSummary).map((line, i) => (
                          <li key={i}>{line}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {resume.parsedSkills && resume.parsedSkills.length > 0 && (
                    <div className="cp-parse-block">
                      <div className="cp-parse-label"><i className="ti ti-code cp-icon-indigo" /> Kỹ năng</div>
                      <div className="cp-skills-wrap">
                        {resume.parsedSkills.map((s) => (
                          <span key={s} className="cp-skill-tag">{s}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {resume.parsedExperience && resume.parsedExperience.length > 0 && (
                    <div className="cp-parse-block">
                      <div className="cp-parse-label"><i className="ti ti-briefcase cp-icon-indigo" /> Kinh nghiệm làm việc</div>
                      <ExperienceList items={resume.parsedExperience} />
                    </div>
                  )}

                  {resume.parsedEducation && resume.parsedEducation.length > 0 && (
                    <div className="cp-parse-block">
                      <div className="cp-parse-label"><i className="ti ti-school cp-icon-indigo" /> Học vấn</div>
                      <EduList items={resume.parsedEducation} />
                    </div>
                  )}

                  <div className="cp-alert cp-alert-ok">
                    <i className="ti ti-robot" />
                    <span>Thông tin trên được trích xuất tự động từ CV của bạn. Nếu có sai sót, hãy tải lên CV mới — hệ thống sẽ cập nhật trong vài giây.</span>
                  </div>
                </div>
              )}

              {/* CV có nhưng chưa phân tích */}
              {resume && !resume.isAnalyzed && (
                <div className="cp-alert cp-alert-info">
                  <i className="ti ti-robot" />
                  <span>CV đang được AI phân tích. Quá trình này thường mất vài giây đến 1 phút. Hãy làm mới trang để xem kết quả.</span>
                </div>
              )}

            </div>
          </div>

        </div>{/* end LEFT */}

        {/* ════ RIGHT ════ */}
        <div className="cp-right">

          {/* Mức độ hoàn thiện */}
          <div className="cp-card">
            <div className="cp-card-head">
              <div className="cp-ch-icon cp-chi-teal"><i className="ti ti-chart-pie" /></div>
              <div><div className="cp-card-title">Mức độ hoàn thiện</div></div>
            </div>
            <div className="cp-card-body">
              <div className="cp-comp-pct-row">
                <div className="cp-comp-pct">{completionPct}%</div>
                <div className="cp-comp-lbl">hồ sơ đã điền</div>
              </div>
              <div className="cp-comp-bar">
                <div className="cp-comp-fill" style={{ width: `${completionPct}%` }} />
              </div>
              <div className="cp-comp-list">
                {completionItems.map((item) => (
                  <div key={item.label} className={`cp-comp-item${item.done ? ' done' : ''}`}>
                    <div className={`cp-ci-check${item.done ? ' cc-done' : ' cc-pend'}`}>
                      <i className={`ti ${item.done ? 'ti-check' : item.icon}`} />
                    </div>
                    {item.label}
                  </div>
                ))}
              </div>
              <div className="cp-alert cp-alert-info">
                <i className="ti ti-info-circle" />
                <span>Hồ sơ trên <strong>90%</strong> giúp nhà tuyển dụng tin tưởng hơn và tăng cơ hội được xem xét.</span>
              </div>
            </div>
          </div>

          {/* CTA */}
          <div className="cp-apply-cta">
            <div className="cp-cta-title">
              {resume ? 'Sẵn sàng ứng tuyển!' : 'Chưa có CV'}
            </div>
            <div className="cp-cta-sub">
              {resume
                ? 'CV của bạn đã sẵn sàng. Khám phá các vị trí phù hợp và nộp đơn ngay.'
                : 'Tải lên CV để AI phân tích và tìm việc làm phù hợp với bạn.'
              }
            </div>
            <button
              className="cp-btn-apply"
              onClick={() => resume ? navigate('/candidate/jobs') : fileInputRef.current?.click()}
            >
              <i className={`ti ${resume ? 'ti-briefcase' : 'ti-upload'}`} />
              {resume ? 'Xem việc làm phù hợp' : 'Tải lên CV ngay'}
            </button>
          </div>

          {/* Điều kiện ứng tuyển */}
          <div className="cp-card">
            <div className="cp-card-head">
              <div className={`cp-ch-icon ${resume?.isAnalyzed ? 'cp-chi-hired' : 'cp-chi-indigo'}`}>
                <i className={`ti ${resume?.isAnalyzed ? 'ti-shield-check' : 'ti-shield'}`} />
              </div>
              <div><div className="cp-card-title">Điều kiện ứng tuyển</div></div>
            </div>
            <div className="cp-card-body cp-card-body-sm">
              <div className={`cp-comp-item cp-cond-item${resume ? ' done' : ''}`}>
                <div className={`cp-ci-check${resume ? ' cc-done' : ' cc-pend'}`}>
                  <i className="ti ti-check" />
                </div>
                <span>Đã có CV trên hệ thống</span>
              </div>
              <div className={`cp-comp-item cp-cond-item${resume?.isAnalyzed ? ' done' : ''}`}>
                <div className={`cp-ci-check${resume?.isAnalyzed ? ' cc-done' : ' cc-pend'}`}>
                  <i className="ti ti-check" />
                </div>
                <span>CV đã được AI phân tích xong</span>
              </div>
              <div className="cp-cond-note">
                {resume?.isAnalyzed
                  ? <>Bạn đã đáp ứng đủ điều kiện. Hãy tìm việc làm và bấm <strong>"Ứng tuyển"</strong> để bắt đầu!</>
                  : 'Tải lên CV để hoàn thiện điều kiện ứng tuyển.'
                }
              </div>
            </div>
          </div>

        </div>{/* end RIGHT */}

      </div>{/* end cp-layout */}

      {/* ══ SAVE BAR ══ */}
      <div className="cp-save-bar">
        <div className="cp-save-hint">
          {saveOk
            ? <><i className="ti ti-circle-check cp-save-ok" /> Đã lưu thành công</>
            : updateMutation.isError
              ? <><i className="ti ti-alert-circle cp-save-err" /> Lưu thất bại</>
              : <><i className="ti ti-clock" /> Cập nhật thông tin và nhấn Lưu hồ sơ</>
          }
        </div>
        <div className="cp-save-actions">
          <button
            className="cp-btn-ghost"
            onClick={handleReset}
            disabled={updateMutation.isPending}
          >
            Huỷ thay đổi
          </button>
          <button
            className="cp-btn-primary"
            onClick={handleSave}
            disabled={updateMutation.isPending}
          >
            {updateMutation.isPending
              ? <><span className="cp-btn-spinner" /> Đang lưu...</>
              : <><i className="ti ti-device-floppy" /> Lưu hồ sơ</>
            }
          </button>
        </div>
      </div>

    </CandidateLayout>
  )
}
