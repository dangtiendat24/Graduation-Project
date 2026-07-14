import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import DashboardLayout from '../../layouts/DashboardLayout/DashboardLayout'
import { getJob, updateJob } from '../../api/jobs'
import './RecruiterJobEditPage.css'

interface JobForm {
  title: string
  department: string
  level: string
  workModel: 'onsite' | 'hybrid' | 'remote' | ''
  location: string
  headcount: string
  description: string
  requirements: string
  requiredSkills: string[]
  minExperience: string
  salaryMin: string
  salaryMax: string
  jobPerks: string[]
  deadline: string
  status: 'draft' | 'active' | 'closed'
}

type StringField = Exclude<keyof JobForm, 'requiredSkills' | 'jobPerks' | 'workModel' | 'status'>

const WORK_MODEL_OPTS: { value: 'onsite' | 'hybrid' | 'remote'; label: string; icon: string }[] = [
  { value: 'onsite', label: 'Tại văn phòng', icon: 'ti-building' },
  { value: 'hybrid', label: 'Hybrid', icon: 'ti-home-and-building' },
  { value: 'remote', label: 'Remote', icon: 'ti-home' },
]

const DEPARTMENTS = [
  'Công nghệ (Engineering)',
  'Sản phẩm (Product)',
  'Kinh doanh (Sales)',
  'Marketing',
  'Nhân sự (HR)',
  'Tài chính (Finance)',
  'Vận hành (Operations)',
  'Thiết kế (Design)',
  'Khác',
]

const LEVELS = [
  { value: 'intern', label: 'Intern / Thực tập sinh' },
  { value: 'junior', label: 'Junior (0–2 năm)' },
  { value: 'middle', label: 'Middle (2–4 năm)' },
  { value: 'senior', label: 'Senior (4+ năm)' },
  { value: 'lead', label: 'Lead / Manager' },
  { value: 'director', label: 'Director / C-level' },
]

const MIN_EXP_OPTS = [
  'Không yêu cầu',
  'Dưới 1 năm',
  '1–2 năm',
  '2–4 năm',
  '4+ năm',
  '5+ năm',
  '7+ năm',
]

function parseSalaryRange(raw: string | null): { min: string; max: string } {
  if (!raw) return { min: '', max: '' }
  const rangeMatch = raw.match(/(\d+)[–\-](\d+)/)
  if (rangeMatch) return { min: rangeMatch[1], max: rangeMatch[2] }
  const fromMatch = raw.match(/Từ\s*(\d+)/)
  if (fromMatch) return { min: fromMatch[1], max: '' }
  const toMatch = raw.match(/Đến\s*(\d+)/)
  if (toMatch) return { min: '', max: toMatch[1] }
  return { min: '', max: '' }
}

export default function RecruiterJobEditPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [form, setForm] = useState<JobForm | null>(null)
  const [skillInput, setSkillInput] = useState('')
  const [perkInput, setPerkInput] = useState('')
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')

  const { data: job, isLoading, isError } = useQuery({
    queryKey: ['job', id],
    queryFn: () => getJob(id!),
    enabled: !!id,
  })

  useEffect(() => {
    if (!job) return
    const salary = parseSalaryRange(job.salaryRange)
    setForm({
      title: job.title,
      department: job.department ?? '',
      level: job.level ?? '',
      workModel: (job.workModel as JobForm['workModel']) ?? '',
      location: job.location ?? '',
      headcount: String(job.headcount),
      description: job.description,
      requirements: job.requirements,
      requiredSkills: job.requiredSkills ?? [],
      minExperience: job.minExperience ?? '',
      salaryMin: salary.min,
      salaryMax: salary.max,
      jobPerks: job.jobPerks ?? [],
      deadline: job.deadline ?? '',
      status: job.status,
    })
  }, [job])

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="rje-loading">
          <i className="ti ti-loader-2 rje-spin" /> Đang tải dữ liệu…
        </div>
      </DashboardLayout>
    )
  }

  if (isError || !job) {
    return (
      <DashboardLayout>
        <div className="rje-error">
          <i className="ti ti-alert-circle" /> Không tìm thấy tin tuyển dụng.
          <button onClick={() => navigate('/recruiter/jobs')}>Quay lại</button>
        </div>
      </DashboardLayout>
    )
  }

  if (!form) return null

  const setField =
    (key: StringField) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      setForm(prev => prev ? { ...prev, [key]: e.target.value } : prev)
    }

  const handleTagKey =
    (list: 'requiredSkills' | 'jobPerks', value: string, clear: () => void) =>
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key !== 'Enter' || !value.trim()) return
      e.preventDefault()
      setForm(prev => prev ? { ...prev, [list]: [...prev[list], value.trim()] } : prev)
      clear()
    }

  const handleTagBackspace =
    (list: 'requiredSkills' | 'jobPerks', value: string) =>
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Backspace' && !value) {
        setForm(prev => prev ? { ...prev, [list]: prev[list].slice(0, -1) } : prev)
      }
    }

  const removeTag = (list: 'requiredSkills' | 'jobPerks', idx: number) =>
    setForm(prev => prev ? { ...prev, [list]: prev[list].filter((_, i) => i !== idx) } : prev)

  const handleSave = async () => {
    if (!form.title.trim() || !id) return
    setSaveStatus('saving')
    try {
      await updateJob(id, {
        title: form.title,
        description: form.description,
        requirements: form.requirements,
        department: form.department || undefined,
        level: form.level || undefined,
        location: form.location || undefined,
        headcount: Number(form.headcount) || 1,
        workModel: form.workModel || undefined,
        requiredSkills: form.requiredSkills.length ? form.requiredSkills : undefined,
        minExperience: form.minExperience || undefined,
        salaryRange:
          form.salaryMin && form.salaryMax
            ? `${form.salaryMin}–${form.salaryMax} triệu`
            : form.salaryMin
              ? `Từ ${form.salaryMin} triệu`
              : form.salaryMax
                ? `Đến ${form.salaryMax} triệu`
                : undefined,
        jobPerks: form.jobPerks.length ? form.jobPerks : undefined,
        status: form.status,
        deadline: form.deadline || undefined,
      })
      setSaveStatus('saved')
      setTimeout(() => {
        setSaveStatus('idle')
        navigate('/recruiter/jobs')
      }, 1200)
    } catch {
      setSaveStatus('error')
      setTimeout(() => setSaveStatus('idle'), 3000)
    }
  }

  const topActions = (
    <div className="rje-topbar-actions">
      <button className="rje-btn-ghost" onClick={() => navigate('/recruiter/jobs')}>
        <i className="ti ti-arrow-left" /> Quay lại
      </button>
      <button
        className="rje-btn-primary"
        onClick={handleSave}
        disabled={saveStatus === 'saving' || !form.title.trim()}
      >
        {saveStatus === 'saving'
          ? <><i className="ti ti-loader-2 rje-spin" /> Đang lưu…</>
          : <><i className="ti ti-device-floppy" /> Lưu thay đổi</>}
      </button>
    </div>
  )

  return (
    <DashboardLayout actions={topActions}>
      <div className="rje-page">

        <div className="rje-header">
          <div className="rje-breadcrumb">
            <i className="ti ti-briefcase" />
            <span className="rje-bc-link" onClick={() => navigate('/recruiter/jobs')}>Tin tuyển dụng</span>
            <i className="ti ti-chevron-right" />
            <span className="rje-bc-current">Chỉnh sửa: {job.title}</span>
          </div>
          <div className="rje-header-sub">Cập nhật thông tin tin tuyển dụng</div>
        </div>

        <div className="rje-layout">
          <div className="rje-forms">

            {/* Card 1 */}
            <div className="rje-card">
              <div className="rje-card-head">
                <div className="rje-card-icon rje-icon-indigo"><i className="ti ti-file-description" /></div>
                <div>
                  <div className="rje-card-title">Thông tin cơ bản</div>
                  <div className="rje-card-sub">Tên vị trí, phòng ban, hình thức làm việc</div>
                </div>
              </div>
              <div className="rje-card-body">

                <div className="rje-form-group">
                  <label className="rje-label">Tên vị trí <span className="rje-req">*</span></label>
                  <div className="rje-input-icon">
                    <i className="ti ti-briefcase" />
                    <input className="rje-input" value={form.title} onChange={setField('title')}
                      placeholder="VD: Senior Backend Developer…" />
                  </div>
                </div>

                <div className="rje-form-row">
                  <div className="rje-form-group">
                    <label className="rje-label">Phòng ban</label>
                    <select className="rje-select" value={form.department} onChange={setField('department')}>
                      <option value="">-- Chọn phòng ban --</option>
                      {DEPARTMENTS.map(d => <option key={d}>{d}</option>)}
                    </select>
                  </div>
                  <div className="rje-form-group">
                    <label className="rje-label">Cấp bậc</label>
                    <select className="rje-select" value={form.level} onChange={setField('level')}>
                      <option value="">-- Chọn cấp bậc --</option>
                      {LEVELS.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
                    </select>
                  </div>
                </div>

                <div className="rje-form-group">
                  <label className="rje-label">Hình thức làm việc</label>
                  <div className="rje-wm-group">
                    {WORK_MODEL_OPTS.map(opt => (
                      <label key={opt.value}
                        className={`rje-wm-opt${form.workModel === opt.value ? ' checked' : ''}`}>
                        <input type="radio" name="workModel" value={opt.value}
                          checked={form.workModel === opt.value}
                          onChange={() => setForm(prev => prev ? { ...prev, workModel: opt.value } : prev)} />
                        <i className={`ti ${opt.icon}`} style={{ fontSize: 14 }} />
                        {opt.label}
                      </label>
                    ))}
                  </div>
                </div>

                <div className="rje-form-row">
                  <div className="rje-form-group">
                    <label className="rje-label">Địa điểm</label>
                    <div className="rje-input-icon">
                      <i className="ti ti-map-pin" />
                      <input className="rje-input" value={form.location} onChange={setField('location')}
                        placeholder="VD: Hà Nội, TP. HCM…" />
                    </div>
                  </div>
                  <div className="rje-form-group">
                    <label className="rje-label">Số lượng tuyển</label>
                    <div className="rje-input-icon">
                      <i className="ti ti-users" />
                      <input className="rje-input" type="number" min="1"
                        value={form.headcount} onChange={setField('headcount')} />
                    </div>
                  </div>
                </div>

              </div>
            </div>

            {/* Card 2 */}
            <div className="rje-card">
              <div className="rje-card-head">
                <div className="rje-card-icon rje-icon-teal"><i className="ti ti-align-left" /></div>
                <div>
                  <div className="rje-card-title">Mô tả công việc</div>
                  <div className="rje-card-sub">Giới thiệu vị trí và nhiệm vụ hàng ngày</div>
                </div>
              </div>
              <div className="rje-card-body">
                <div className="rje-form-group">
                  <label className="rje-label">Mô tả vị trí <span className="rje-req">*</span></label>
                  <textarea className="rje-textarea" rows={8} value={form.description}
                    onChange={setField('description')} />
                  <div className="rje-char-count">{form.description.length} ký tự</div>
                </div>
              </div>
            </div>

            {/* Card 3 */}
            <div className="rje-card">
              <div className="rje-card-head">
                <div className="rje-card-icon rje-icon-violet"><i className="ti ti-checklist" /></div>
                <div>
                  <div className="rje-card-title">Yêu cầu ứng viên</div>
                  <div className="rje-card-sub">Kỹ năng và tiêu chí tuyển chọn</div>
                </div>
              </div>
              <div className="rje-card-body">

                <div className="rje-form-group">
                  <label className="rje-label">Kỹ năng yêu cầu</label>
                  <div className="rje-tags-wrap">
                    {form.requiredSkills.map((tag, i) => (
                      <span key={i} className="rje-tag rje-tag--indigo">
                        {tag}
                        <button className="rje-tag-x" type="button" onClick={() => removeTag('requiredSkills', i)}>
                          <i className="ti ti-x" />
                        </button>
                      </span>
                    ))}
                    <input className="rje-tag-input" value={skillInput}
                      onChange={e => setSkillInput(e.target.value)}
                      onKeyDown={e => {
                        handleTagKey('requiredSkills', skillInput, () => setSkillInput(''))(e)
                        handleTagBackspace('requiredSkills', skillInput)(e)
                      }}
                      placeholder={form.requiredSkills.length === 0 ? 'Thêm kỹ năng, nhấn Enter…' : ''} />
                  </div>
                </div>

                <div className="rje-form-group">
                  <label className="rje-label">Yêu cầu chi tiết <span className="rje-req">*</span></label>
                  <textarea className="rje-textarea" rows={8} value={form.requirements}
                    onChange={setField('requirements')} />
                  <div className="rje-char-count">{form.requirements.length} ký tự</div>
                </div>

                <div className="rje-form-group">
                  <label className="rje-label">Kinh nghiệm tối thiểu</label>
                  <select className="rje-select" value={form.minExperience} onChange={setField('minExperience')}>
                    <option value="">-- Chọn --</option>
                    {MIN_EXP_OPTS.map(o => <option key={o}>{o}</option>)}
                  </select>
                </div>

              </div>
            </div>

            {/* Card 4 */}
            <div className="rje-card">
              <div className="rje-card-head">
                <div className="rje-card-icon rje-icon-amber"><i className="ti ti-coin" /></div>
                <div>
                  <div className="rje-card-title">Đãi ngộ & Cài đặt</div>
                  <div className="rje-card-sub">Mức lương, hạn nộp và trạng thái tin</div>
                </div>
              </div>
              <div className="rje-card-body">

                <div className="rje-form-row">
                  <div className="rje-form-group">
                    <label className="rje-label">Mức lương</label>
                    <div className="rje-salary-row">
                      <div className="rje-input-prefix">
                        <span className="rje-prefix">Từ</span>
                        <input className="rje-input rje-input-suffix" type="number" min="0"
                          value={form.salaryMin} onChange={setField('salaryMin')} placeholder="0" />
                      </div>
                      <span className="rje-salary-sep">–</span>
                      <div className="rje-input-prefix">
                        <span className="rje-prefix">Đến</span>
                        <input className="rje-input rje-input-suffix" type="number" min="0"
                          value={form.salaryMax} onChange={setField('salaryMax')} placeholder="0" />
                      </div>
                    </div>
                    <div className="rje-hint">Triệu VNĐ / tháng</div>
                  </div>
                  <div className="rje-form-group">
                    <label className="rje-label">Hạn nộp đơn</label>
                    <div className="rje-input-icon">
                      <i className="ti ti-calendar" />
                      <input className="rje-input" type="date" value={form.deadline} onChange={setField('deadline')} />
                    </div>
                  </div>
                </div>

                <div className="rje-form-group">
                  <label className="rje-label">Phúc lợi nổi bật</label>
                  <div className="rje-tags-wrap">
                    {form.jobPerks.map((tag, i) => (
                      <span key={i} className="rje-tag rje-tag--green">
                        {tag}
                        <button className="rje-tag-x rje-tag-x--green" type="button" onClick={() => removeTag('jobPerks', i)}>
                          <i className="ti ti-x" />
                        </button>
                      </span>
                    ))}
                    <input className="rje-tag-input" value={perkInput}
                      onChange={e => setPerkInput(e.target.value)}
                      onKeyDown={e => {
                        handleTagKey('jobPerks', perkInput, () => setPerkInput(''))(e)
                        handleTagBackspace('jobPerks', perkInput)(e)
                      }}
                      placeholder={form.jobPerks.length === 0 ? 'Thêm phúc lợi, nhấn Enter…' : ''} />
                  </div>
                </div>

                <div className="rje-form-group">
                  <label className="rje-label">Trạng thái tin <span className="rje-req">*</span></label>
                  <div className="rje-status-toggle">
                    {(['draft', 'active', 'closed'] as const).map(s => (
                      <label key={s} className={`rje-st-opt${form.status === s ? ` ${s}` : ''}`}>
                        <input type="radio" name="status" value={s}
                          checked={form.status === s}
                          onChange={() => setForm(prev => prev ? { ...prev, status: s } : prev)} />
                        <i className={`ti ${s === 'draft' ? 'ti-pencil' : s === 'active' ? 'ti-send' : 'ti-lock'}`}
                          style={{ fontSize: 15 }} />
                        {s === 'draft' ? 'Nháp' : s === 'active' ? 'Đang tuyển' : 'Đã đóng'}
                      </label>
                    ))}
                  </div>
                </div>

              </div>
            </div>

          </div>

          {/* Side panel */}
          <div className="rje-side">
            <div className="rje-rp-card">
              <div className="rje-rp-head">
                <div className="rje-rp-icon rje-rpi-indigo"><i className="ti ti-info-circle" /></div>
                <div className="rje-rp-title">Thông tin tin đăng</div>
              </div>
              <div className="rje-rp-body">
                <div className="rje-info-row">
                  <span className="rje-info-label">Ngày tạo</span>
                  <span className="rje-info-val">
                    {new Date(job.createdAt).toLocaleDateString('vi-VN')}
                  </span>
                </div>
                <div className="rje-info-row">
                  <span className="rje-info-label">Cập nhật lần cuối</span>
                  <span className="rje-info-val">
                    {new Date(job.updatedAt).toLocaleDateString('vi-VN')}
                  </span>
                </div>
                <div className="rje-info-row">
                  <span className="rje-info-label">ID</span>
                  <span className="rje-info-val rje-info-mono">{job.id.slice(0, 8)}…</span>
                </div>
              </div>
            </div>

            <div className="rje-rp-card rje-rp-card--warn">
              <div className="rje-rp-head">
                <div className="rje-rp-icon rje-rpi-amber"><i className="ti ti-alert-triangle" /></div>
                <div className="rje-rp-title">Lưu ý khi chỉnh sửa</div>
              </div>
              <div className="rje-rp-body rje-tips-list">
                <div className="rje-tip-item">
                  <i className="ti ti-check rje-tip-icon" />
                  <span>Thay đổi kỹ năng yêu cầu sẽ ảnh hưởng đến điểm AI matching của ứng viên mới</span>
                </div>
                <div className="rje-tip-item">
                  <i className="ti ti-check rje-tip-icon" />
                  <span>Đổi status sang <strong>Đã đóng</strong> sẽ ẩn tin khỏi danh sách tìm kiếm</span>
                </div>
                <div className="rje-tip-item">
                  <i className="ti ti-check rje-tip-icon" />
                  <span>Ứng viên đã nộp đơn <strong>không</strong> bị ảnh hưởng khi tin được cập nhật</span>
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* Save bar */}
        <div className="rje-save-bar">
          <div className="rje-save-hint">
            {saveStatus === 'saving' ? (
              <><i className="ti ti-loader-2 rje-spin" /> Đang lưu…</>
            ) : saveStatus === 'saved' ? (
              <><i className="ti ti-circle-check" style={{ color: 'var(--color-hired)' }} /> Đã lưu thành công</>
            ) : saveStatus === 'error' ? (
              <><i className="ti ti-alert-circle" style={{ color: 'var(--color-danger)' }} /> Lưu thất bại, thử lại</>
            ) : (
              <><i className="ti ti-pencil" /> Đang chỉnh sửa — {job.title}</>
            )}
          </div>
          <div className="rje-save-actions">
            <button className="rje-btn-ghost" onClick={() => navigate('/recruiter/jobs')}>Huỷ</button>
            <button
              className="rje-btn-primary"
              onClick={handleSave}
              disabled={saveStatus === 'saving' || !form.title.trim()}
            >
              <i className="ti ti-device-floppy" /> Lưu thay đổi
            </button>
          </div>
        </div>

      </div>
    </DashboardLayout>
  )
}
