import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import DashboardLayout from '../../layouts/DashboardLayout/DashboardLayout'
import { createJob } from '../../api/jobs'
import './RecruiterJobCreatePage.css'

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
  status: 'draft' | 'active'
}

const EMPTY_FORM: JobForm = {
  title: '',
  department: '',
  level: '',
  workModel: '',
  location: '',
  headcount: '1',
  description: '',
  requirements: '',
  requiredSkills: [],
  minExperience: '',
  salaryMin: '',
  salaryMax: '',
  jobPerks: [],
  deadline: '',
  status: 'active',
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

export default function RecruiterJobCreatePage() {
  const navigate = useNavigate()
  const [form, setForm] = useState<JobForm>(EMPTY_FORM)
  const [skillInput, setSkillInput] = useState('')
  const [perkInput, setPerkInput] = useState('')
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')

  const setField =
    (key: StringField) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      setForm(prev => ({ ...prev, [key]: e.target.value }))
    }

  const handleTagKey =
    (list: 'requiredSkills' | 'jobPerks', value: string, clear: () => void) =>
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key !== 'Enter' || !value.trim()) return
      e.preventDefault()
      setForm(prev => ({ ...prev, [list]: [...prev[list], value.trim()] }))
      clear()
    }

  const handleTagBackspace =
    (list: 'requiredSkills' | 'jobPerks', value: string) =>
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Backspace' && !value) {
        setForm(prev => ({
          ...prev,
          [list]: prev[list].slice(0, -1),
        }))
      }
    }

  const removeTag = (list: 'requiredSkills' | 'jobPerks', idx: number) =>
    setForm(prev => ({ ...prev, [list]: prev[list].filter((_, i) => i !== idx) }))

  const handleSave = async (publish: boolean) => {
    if (!form.title.trim()) return
    setSaveStatus('saving')
    try {
      await createJob({
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
        status: publish ? 'active' : 'draft',
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

  // ── Checklist items ──
  const checks = [
    { label: 'Tên vị trí đã điền', done: !!form.title },
    { label: 'Hình thức làm việc đã chọn', done: !!form.workModel },
    { label: 'Kỹ năng yêu cầu đã thêm', done: form.requiredSkills.length > 0 },
    { label: 'Mô tả công việc đã có', done: form.description.length > 50 },
    { label: 'Yêu cầu ứng viên đã điền', done: form.requirements.length > 50 },
    { label: 'Mức lương đã cung cấp', done: !!(form.salaryMin || form.salaryMax) },
    { label: 'Hạn nộp đơn (tuỳ chọn)', done: !!form.deadline },
  ]
  const doneCount = checks.filter(c => c.done).length
  const checkPct = Math.round((doneCount / checks.length) * 100)

  // ── Step indicator ──
  const steps = [
    { label: 'Thông tin cơ bản', done: !!(form.title && form.workModel && form.location) },
    { label: 'Mô tả & Yêu cầu', done: !!(form.description && form.requirements && form.requiredSkills.length > 0) },
    { label: 'Đãi ngộ & Cài đặt', done: !!(form.salaryMin || form.salaryMax) },
  ]

  const topActions = (
    <div className="rjc-topbar-actions">
      <button className="rjc-btn-ghost" onClick={() => navigate('/recruiter/jobs')}>
        <i className="ti ti-arrow-left" /> Quay lại
      </button>
      <button
        className="rjc-btn-ghost"
        onClick={() => handleSave(false)}
        disabled={saveStatus === 'saving' || !form.title.trim()}
      >
        <i className="ti ti-device-floppy" />
        {saveStatus === 'saving' ? 'Đang lưu…' : 'Lưu nháp'}
      </button>
      <button
        className="rjc-btn-teal"
        onClick={() => handleSave(true)}
        disabled={saveStatus === 'saving' || !form.title.trim()}
      >
        <i className="ti ti-send" /> Đăng tuyển
      </button>
    </div>
  )

  return (
    <DashboardLayout actions={topActions}>
      <div className="rjc-page">

        {/* ── Breadcrumb + Step ── */}
        <div className="rjc-header">
          <div className="rjc-breadcrumb">
            <i className="ti ti-briefcase" />
            <span className="rjc-bc-link" onClick={() => navigate('/recruiter/jobs')}>Tin tuyển dụng</span>
            <i className="ti ti-chevron-right" />
            <span className="rjc-bc-current">Đăng tin mới</span>
          </div>
          <div className="rjc-header-sub">Điền đầy đủ thông tin để thu hút ứng viên phù hợp</div>
        </div>

        {/* ── Step indicator ── */}
        <div className="rjc-steps">
          {steps.map((step, i) => (
            <div key={i} className="rjc-step-group">
              <div className="rjc-step">
                <div className={`rjc-step-num${step.done ? ' done' : i === steps.findIndex(s => !s.done) ? ' active' : ' wait'}`}>
                  {step.done ? <i className="ti ti-check" style={{ fontSize: 12 }} /> : i + 1}
                </div>
                <span className={`rjc-step-label${step.done ? ' done' : i === steps.findIndex(s => !s.done) ? ' active' : ''}`}>
                  {step.label}
                </span>
              </div>
              {i < steps.length - 1 && <div className={`rjc-step-line${step.done ? ' done' : ''}`} />}
            </div>
          ))}
        </div>

        {/* ── 2-col layout ── */}
        <div className="rjc-layout">

          {/* ══════ LEFT: Form cards ══════ */}
          <div className="rjc-forms">

            {/* Card 1: Thông tin cơ bản */}
            <div className="rjc-card">
              <div className="rjc-card-head">
                <div className="rjc-card-icon rjc-icon-indigo"><i className="ti ti-file-description" /></div>
                <div>
                  <div className="rjc-card-title">Thông tin cơ bản</div>
                  <div className="rjc-card-sub">Tên vị trí, phòng ban, hình thức làm việc</div>
                </div>
              </div>
              <div className="rjc-card-body">

                <div className="rjc-form-group">
                  <label className="rjc-label">
                    Tên vị trí tuyển dụng <span className="rjc-req">*</span>
                  </label>
                  <div className="rjc-input-icon">
                    <i className="ti ti-briefcase" />
                    <input
                      className="rjc-input"
                      value={form.title}
                      onChange={setField('title')}
                      placeholder="VD: Senior Backend Developer, Product Manager…"
                    />
                  </div>
                  <div className="rjc-hint">Tên rõ ràng, cụ thể giúp ứng viên tìm thấy dễ hơn</div>
                </div>

                <div className="rjc-form-row">
                  <div className="rjc-form-group">
                    <label className="rjc-label">Phòng ban</label>
                    <select className="rjc-select" value={form.department} onChange={setField('department')}>
                      <option value="">-- Chọn phòng ban --</option>
                      {DEPARTMENTS.map(d => <option key={d}>{d}</option>)}
                    </select>
                  </div>
                  <div className="rjc-form-group">
                    <label className="rjc-label">Cấp bậc</label>
                    <select className="rjc-select" value={form.level} onChange={setField('level')}>
                      <option value="">-- Chọn cấp bậc --</option>
                      {LEVELS.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
                    </select>
                  </div>
                </div>

                <div className="rjc-form-group">
                  <label className="rjc-label">Hình thức làm việc <span className="rjc-req">*</span></label>
                  <div className="rjc-wm-group">
                    {WORK_MODEL_OPTS.map(opt => (
                      <label
                        key={opt.value}
                        className={`rjc-wm-opt${form.workModel === opt.value ? ' checked' : ''}`}
                      >
                        <input
                          type="radio"
                          name="workModel"
                          value={opt.value}
                          checked={form.workModel === opt.value}
                          onChange={() => setForm(prev => ({ ...prev, workModel: opt.value }))}
                        />
                        <i className={`ti ${opt.icon}`} style={{ fontSize: 14 }} />
                        {opt.label}
                      </label>
                    ))}
                  </div>
                </div>

                <div className="rjc-form-row">
                  <div className="rjc-form-group">
                    <label className="rjc-label">Địa điểm làm việc <span className="rjc-req">*</span></label>
                    <div className="rjc-input-icon">
                      <i className="ti ti-map-pin" />
                      <input
                        className="rjc-input"
                        value={form.location}
                        onChange={setField('location')}
                        placeholder="VD: Hà Nội, TP. HCM, Đà Nẵng…"
                      />
                    </div>
                  </div>
                  <div className="rjc-form-group">
                    <label className="rjc-label">Số lượng tuyển</label>
                    <div className="rjc-input-icon">
                      <i className="ti ti-users" />
                      <input
                        className="rjc-input"
                        type="number"
                        min="1"
                        value={form.headcount}
                        onChange={setField('headcount')}
                        placeholder="1"
                      />
                    </div>
                  </div>
                </div>

              </div>
            </div>

            {/* Card 2: Mô tả công việc */}
            <div className="rjc-card">
              <div className="rjc-card-head">
                <div className="rjc-card-icon rjc-icon-teal"><i className="ti ti-align-left" /></div>
                <div>
                  <div className="rjc-card-title">Mô tả công việc</div>
                  <div className="rjc-card-sub">Giới thiệu vị trí, nhiệm vụ chính hàng ngày</div>
                </div>
              </div>
              <div className="rjc-card-body">
                <div className="rjc-form-group">
                  <label className="rjc-label">Mô tả vị trí <span className="rjc-req">*</span></label>
                  <textarea
                    className="rjc-textarea"
                    rows={8}
                    value={form.description}
                    onChange={setField('description')}
                    placeholder="Mô tả ngắn gọn về vị trí, đội nhóm, sứ mệnh và những việc ứng viên sẽ làm hàng ngày…"
                  />
                  <div className="rjc-char-count">{form.description.length} ký tự</div>
                </div>
              </div>
            </div>

            {/* Card 3: Yêu cầu ứng viên */}
            <div className="rjc-card">
              <div className="rjc-card-head">
                <div className="rjc-card-icon rjc-icon-violet"><i className="ti ti-checklist" /></div>
                <div>
                  <div className="rjc-card-title">Yêu cầu ứng viên</div>
                  <div className="rjc-card-sub">Kỹ năng, kinh nghiệm và tiêu chí tuyển chọn</div>
                </div>
              </div>
              <div className="rjc-card-body">

                <div className="rjc-form-group">
                  <label className="rjc-label">
                    Kỹ năng yêu cầu <span className="rjc-req">*</span>
                    <span className="rjc-label-tip"> — AI dùng danh sách này để matching với CV</span>
                  </label>
                  <div className="rjc-tags-wrap">
                    {form.requiredSkills.map((tag, i) => (
                      <span key={i} className="rjc-tag rjc-tag--indigo">
                        {tag}
                        <button className="rjc-tag-x" type="button" onClick={() => removeTag('requiredSkills', i)}>
                          <i className="ti ti-x" />
                        </button>
                      </span>
                    ))}
                    <input
                      className="rjc-tag-input"
                      value={skillInput}
                      onChange={e => setSkillInput(e.target.value)}
                      onKeyDown={e => {
                        handleTagKey('requiredSkills', skillInput, () => setSkillInput(''))(e)
                        handleTagBackspace('requiredSkills', skillInput)(e)
                      }}
                      placeholder={form.requiredSkills.length === 0 ? 'Thêm kỹ năng, nhấn Enter…' : ''}
                    />
                  </div>
                  <div className="rjc-hint">Gợi ý: Node.js, Python, React, PostgreSQL, Docker, AWS…</div>
                </div>

                <div className="rjc-form-group">
                  <label className="rjc-label">Yêu cầu chi tiết <span className="rjc-req">*</span></label>
                  <textarea
                    className="rjc-textarea"
                    rows={8}
                    value={form.requirements}
                    onChange={setField('requirements')}
                    placeholder="Liệt kê các yêu cầu: kinh nghiệm, kỹ năng kỹ thuật, soft skill, bằng cấp…"
                  />
                  <div className="rjc-char-count">{form.requirements.length} ký tự</div>
                </div>

                <div className="rjc-form-group">
                  <label className="rjc-label">Kinh nghiệm tối thiểu</label>
                  <select className="rjc-select" value={form.minExperience} onChange={setField('minExperience')}>
                    <option value="">-- Chọn --</option>
                    {MIN_EXP_OPTS.map(o => <option key={o}>{o}</option>)}
                  </select>
                </div>

              </div>
            </div>

            {/* Card 4: Đãi ngộ & Cài đặt */}
            <div className="rjc-card">
              <div className="rjc-card-head">
                <div className="rjc-card-icon rjc-icon-amber"><i className="ti ti-coin" /></div>
                <div>
                  <div className="rjc-card-title">Đãi ngộ & Cài đặt</div>
                  <div className="rjc-card-sub">Mức lương, hạn nộp đơn và trạng thái đăng tin</div>
                </div>
              </div>
              <div className="rjc-card-body">

                <div className="rjc-form-row">
                  <div className="rjc-form-group">
                    <label className="rjc-label">Mức lương <span className="rjc-req">*</span></label>
                    <div className="rjc-salary-row">
                      <div className="rjc-input-prefix">
                        <span className="rjc-prefix">Từ</span>
                        <input
                          className="rjc-input rjc-input-suffix"
                          type="number"
                          min="0"
                          value={form.salaryMin}
                          onChange={setField('salaryMin')}
                          placeholder="0"
                        />
                      </div>
                      <span className="rjc-salary-sep">–</span>
                      <div className="rjc-input-prefix">
                        <span className="rjc-prefix">Đến</span>
                        <input
                          className="rjc-input rjc-input-suffix"
                          type="number"
                          min="0"
                          value={form.salaryMax}
                          onChange={setField('salaryMax')}
                          placeholder="0"
                        />
                      </div>
                    </div>
                    <div className="rjc-hint">Triệu VNĐ / tháng. Không dùng cho AI matching.</div>
                  </div>
                  <div className="rjc-form-group">
                    <label className="rjc-label">Hạn nộp đơn</label>
                    <div className="rjc-input-icon">
                      <i className="ti ti-calendar" />
                      <input
                        className="rjc-input"
                        type="date"
                        value={form.deadline}
                        onChange={setField('deadline')}
                      />
                    </div>
                    <div className="rjc-hint">Để trống nếu không có hạn cụ thể</div>
                  </div>
                </div>

                <div className="rjc-form-group">
                  <label className="rjc-label">
                    Phúc lợi nổi bật
                    <span className="rjc-label-tip"> (tuỳ chọn — nhấn Enter để thêm)</span>
                  </label>
                  <div className="rjc-tags-wrap">
                    {form.jobPerks.map((tag, i) => (
                      <span key={i} className="rjc-tag rjc-tag--green">
                        {tag}
                        <button className="rjc-tag-x rjc-tag-x--green" type="button" onClick={() => removeTag('jobPerks', i)}>
                          <i className="ti ti-x" />
                        </button>
                      </span>
                    ))}
                    <input
                      className="rjc-tag-input"
                      value={perkInput}
                      onChange={e => setPerkInput(e.target.value)}
                      onKeyDown={e => {
                        handleTagKey('jobPerks', perkInput, () => setPerkInput(''))(e)
                        handleTagBackspace('jobPerks', perkInput)(e)
                      }}
                      placeholder={form.jobPerks.length === 0 ? 'Thêm phúc lợi, nhấn Enter…' : ''}
                    />
                  </div>
                </div>

                <div className="rjc-form-group">
                  <label className="rjc-label">Trạng thái đăng tin <span className="rjc-req">*</span></label>
                  <div className="rjc-status-toggle">
                    <label className={`rjc-st-opt${form.status === 'draft' ? ' draft' : ''}`}>
                      <input
                        type="radio"
                        name="status"
                        value="draft"
                        checked={form.status === 'draft'}
                        onChange={() => setForm(prev => ({ ...prev, status: 'draft' }))}
                      />
                      <i className="ti ti-pencil" style={{ fontSize: 15 }} /> Lưu nháp
                    </label>
                    <label className={`rjc-st-opt${form.status === 'active' ? ' active' : ''}`}>
                      <input
                        type="radio"
                        name="status"
                        value="active"
                        checked={form.status === 'active'}
                        onChange={() => setForm(prev => ({ ...prev, status: 'active' }))}
                      />
                      <i className="ti ti-send" style={{ fontSize: 15 }} /> Đăng công khai ngay
                    </label>
                  </div>
                  <div className="rjc-hint">
                    Khi đăng công khai, ứng viên sẽ thấy tin và có thể nộp đơn ngay lập tức.
                  </div>
                </div>

              </div>
            </div>

          </div>{/* end LEFT */}

          {/* ══════ RIGHT: Side panel ══════ */}
          <div className="rjc-side">

            {/* Preview card */}
            <div className="rjc-rp-card">
              <div className="rjc-rp-head">
                <div className="rjc-rp-icon rjc-rpi-indigo"><i className="ti ti-eye" /></div>
                <div className="rjc-rp-title">Xem trước tin đăng</div>
              </div>
              <div className="rjc-rp-body">
                <div className="rjc-preview-jd">
                  <div className="rjc-pjd-top">
                    <div className="rjc-pjd-title">{form.title || 'Tên vị trí'}</div>
                    <div className="rjc-pjd-co">
                      <i className="ti ti-building" style={{ fontSize: 12 }} />
                      <span>Công ty của bạn</span>
                    </div>
                  </div>
                  <div className="rjc-pjd-body">
                    {(form.location || form.workModel) && (
                      <div className="rjc-pjd-row">
                        <i className="ti ti-map-pin" />
                        {form.location || '—'}{form.workModel && ` · ${form.workModel}`}
                      </div>
                    )}
                    {(form.headcount || form.level) && (
                      <div className="rjc-pjd-row">
                        <i className="ti ti-users" />
                        {form.headcount} vị trí{form.level && ` · ${form.level}`}
                      </div>
                    )}
                    {form.deadline && (
                      <div className="rjc-pjd-row">
                        <i className="ti ti-calendar" />
                        Hạn: {new Date(form.deadline).toLocaleDateString('vi-VN')}
                      </div>
                    )}
                    <div className="rjc-pjd-tags">
                      {(form.salaryMin || form.salaryMax) && (
                        <span className="rjc-pjd-tag rjc-pjd-salary">
                          {form.salaryMin && form.salaryMax
                            ? `${form.salaryMin}–${form.salaryMax} triệu`
                            : form.salaryMin
                              ? `Từ ${form.salaryMin} triệu`
                              : `Đến ${form.salaryMax} triệu`}
                        </span>
                      )}
                      {form.workModel && (
                        <span className="rjc-pjd-tag rjc-pjd-wm">{form.workModel}</span>
                      )}
                      {form.requiredSkills.slice(0, 3).map((s, i) => (
                        <span key={i} className="rjc-pjd-tag">{s}</span>
                      ))}
                      {form.requiredSkills.length > 3 && (
                        <span className="rjc-pjd-tag">+{form.requiredSkills.length - 3}</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="rjc-preview-note">Đây là cách ứng viên thấy tin của bạn</div>
              </div>
            </div>

            {/* Checklist */}
            <div className="rjc-rp-card">
              <div className="rjc-rp-head">
                <div className="rjc-rp-icon rjc-rpi-teal"><i className="ti ti-checklist" /></div>
                <div className="rjc-rp-title">Kiểm tra trước khi đăng</div>
              </div>
              <div className="rjc-rp-body">
                {checks.map((item, i) => (
                  <div key={i} className={`rjc-check-item${item.done ? ' done' : ''}`}>
                    <i className={`ti ${item.done ? 'ti-circle-check' : 'ti-circle'} rjc-check-icon`} />
                    <span>{item.label}</span>
                  </div>
                ))}
                <div className="rjc-progress-wrap">
                  <div className="rjc-progress-bar">
                    <div className="rjc-progress-fill" style={{ width: `${checkPct}%` }} />
                  </div>
                  <div className="rjc-progress-label">{doneCount}/{checks.length} mục hoàn thành</div>
                </div>
              </div>
            </div>

            {/* AI matching note */}
            <div className="rjc-rp-card">
              <div className="rjc-rp-head">
                <div className="rjc-rp-icon rjc-rpi-violet"><i className="ti ti-robot" /></div>
                <div className="rjc-rp-title">Cách AI hoạt động</div>
              </div>
              <div className="rjc-rp-body rjc-tips-list">
                <div className="rjc-tip-item">
                  <i className="ti ti-sparkles rjc-tip-icon" />
                  <span>AI so sánh <strong>kỹ năng yêu cầu</strong> với CV ứng viên để tính điểm phù hợp</span>
                </div>
                <div className="rjc-tip-item">
                  <i className="ti ti-code rjc-tip-icon" />
                  <span>Thêm nhiều kỹ năng cụ thể → kết quả matching càng chính xác</span>
                </div>
                <div className="rjc-tip-item">
                  <i className="ti ti-align-left rjc-tip-icon" />
                  <span>Mô tả và yêu cầu chi tiết giúp AI phỏng vấn đặt câu hỏi phù hợp hơn</span>
                </div>
                <div className="rjc-tip-item">
                  <i className="ti ti-coin rjc-tip-icon" />
                  <span>Mức lương <strong>không</strong> ảnh hưởng đến điểm AI — chỉ để ứng viên tham khảo</span>
                </div>
              </div>
            </div>

            {/* Tips */}
            <div className="rjc-rp-card">
              <div className="rjc-rp-head">
                <div className="rjc-rp-icon rjc-rpi-amber"><i className="ti ti-bulb" /></div>
                <div className="rjc-rp-title">Mẹo viết JD tốt</div>
              </div>
              <div className="rjc-rp-body rjc-tips-list">
                <div className="rjc-tip-item">
                  <i className="ti ti-check rjc-tip-icon" />
                  <span>Tên vị trí ngắn gọn, tránh từ như "Ninja", "Rockstar"</span>
                </div>
                <div className="rjc-tip-item">
                  <i className="ti ti-check rjc-tip-icon" />
                  <span>Phân chia rõ "bắt buộc" và "ưu tiên" trong yêu cầu</span>
                </div>
                <div className="rjc-tip-item">
                  <i className="ti ti-check rjc-tip-icon" />
                  <span>Đề cập rõ team size, tech stack và product hiện tại</span>
                </div>
                <div className="rjc-tip-item">
                  <i className="ti ti-check rjc-tip-icon" />
                  <span>Nêu mức lương cụ thể tăng tỷ lệ ứng tuyển lên 3×</span>
                </div>
              </div>
            </div>

          </div>{/* end RIGHT */}

        </div>{/* end layout */}

        {/* ── Sticky save bar ── */}
        <div className="rjc-save-bar">
          <div className="rjc-save-hint">
            {saveStatus === 'saving' ? (
              <><i className="ti ti-loader-2 rjc-spin" /> Đang lưu…</>
            ) : saveStatus === 'saved' ? (
              <><i className="ti ti-circle-check" style={{ color: 'var(--color-hired)' }} /> Đã lưu thành công</>
            ) : saveStatus === 'error' ? (
              <><i className="ti ti-alert-circle" style={{ color: 'var(--color-danger)' }} /> Lưu thất bại, thử lại</>
            ) : (
              <><i className="ti ti-clock" /> Chưa lưu</>
            )}
          </div>
          <div className="rjc-save-actions">
            <button
              className="rjc-btn-ghost"
              onClick={() => navigate('/recruiter/jobs')}
            >
              Huỷ
            </button>
            <button
              className="rjc-btn-ghost"
              onClick={() => handleSave(false)}
              disabled={saveStatus === 'saving' || !form.title.trim()}
            >
              <i className="ti ti-device-floppy" /> Lưu nháp
            </button>
            <button
              className="rjc-btn-primary"
              onClick={() => handleSave(true)}
              disabled={saveStatus === 'saving' || !form.title.trim()}
            >
              <i className="ti ti-send" /> Đăng tuyển ngay
            </button>
          </div>
        </div>

      </div>
    </DashboardLayout>
  )
}
