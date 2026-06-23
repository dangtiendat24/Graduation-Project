import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import DashboardLayout from '../../layouts/DashboardLayout/DashboardLayout'
import { getMyCompany, upsertCompany, type CompanyData } from '../../api/companies'
import './RecruiterCompanyPage.css'

interface CompanyForm {
  name: string
  shortName: string
  tagline: string
  industry: string
  companyType: string
  sizeRange: string
  foundedYear: string
  shortDesc: string
  fullDesc: string
  techStack: string[]
  perks: string[]
  workModel: string
  workLanguage: string
  address: string
  city: string
  website: string
  linkedinUrl: string
  facebookUrl: string
  logoUrl: string
  coverUrl: string
}

const EMPTY_FORM: CompanyForm = {
  name: '',
  shortName: '',
  tagline: '',
  industry: '',
  companyType: '',
  sizeRange: '',
  foundedYear: '',
  shortDesc: '',
  fullDesc: '',
  techStack: [],
  perks: [],
  workModel: '',
  workLanguage: '',
  address: '',
  city: '',
  website: '',
  linkedinUrl: '',
  facebookUrl: '',
  logoUrl: '',
  coverUrl: '',
}

function serverToForm(d: CompanyData): CompanyForm {
  return {
    name: d.name ?? '',
    shortName: d.shortName ?? '',
    tagline: d.tagline ?? '',
    industry: d.industry ?? '',
    companyType: d.companyType ?? '',
    sizeRange: d.sizeRange ?? '',
    foundedYear: d.foundedYear != null ? String(d.foundedYear) : '',
    shortDesc: d.shortDesc ?? '',
    fullDesc: d.fullDesc ?? '',
    techStack: d.techStack ?? [],
    perks: d.perks ?? [],
    workModel: d.workModel ?? '',
    workLanguage: d.workLanguage ?? '',
    address: d.address ?? '',
    city: d.city ?? '',
    website: d.website ?? '',
    linkedinUrl: d.linkedinUrl ?? '',
    facebookUrl: d.facebookUrl ?? '',
    logoUrl: d.logoUrl ?? '',
    coverUrl: d.coverUrl ?? '',
  }
}

function formToPayload(f: CompanyForm, publish: boolean): CompanyData {
  return {
    name: f.name,
    shortName: f.shortName || null,
    tagline: f.tagline || null,
    industry: f.industry || null,
    companyType: f.companyType || null,
    sizeRange: f.sizeRange || null,
    foundedYear: f.foundedYear ? Number(f.foundedYear) : null,
    shortDesc: f.shortDesc || null,
    fullDesc: f.fullDesc || null,
    techStack: f.techStack.length > 0 ? f.techStack : null,
    perks: f.perks.length > 0 ? f.perks : null,
    workModel: f.workModel || null,
    workLanguage: f.workLanguage || null,
    address: f.address || null,
    city: f.city || null,
    website: f.website || null,
    linkedinUrl: f.linkedinUrl || null,
    facebookUrl: f.facebookUrl || null,
    logoUrl: f.logoUrl || null,
    coverUrl: f.coverUrl || null,
    isPublished: publish,
  }
}

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

type StringField = Exclude<keyof CompanyForm, 'techStack' | 'perks'>

export default function RecruiterCompanyPage() {
  const queryClient = useQueryClient()
  const [mode, setMode] = useState<'edit' | 'preview'>('edit')
  const [form, setForm] = useState<CompanyForm>(EMPTY_FORM)
  const [savedForm, setSavedForm] = useState<CompanyForm>(EMPTY_FORM)
  const [techInput, setTechInput] = useState('')
  const [perkInput, setPerkInput] = useState('')
  const [saveMsg, setSaveMsg] = useState<'idle' | 'saved' | 'error'>('idle')

  const { data: serverData, isLoading } = useQuery({
    queryKey: ['company-my'],
    queryFn: getMyCompany,
  })

  useEffect(() => {
    if (serverData) {
      const f = serverToForm(serverData)
      setForm(f)
      setSavedForm(f)
    }
  }, [serverData])

  const mutation = useMutation({
    mutationFn: (payload: CompanyData) => upsertCompany(payload),
    onSuccess: saved => {
      const f = serverToForm(saved)
      setSavedForm(f)
      setSaveMsg('saved')
      queryClient.setQueryData(['company-my'], saved)
      setTimeout(() => setSaveMsg('idle'), 3000)
    },
    onError: () => {
      setSaveMsg('error')
      setTimeout(() => setSaveMsg('idle'), 4000)
    },
  })

  const handleSave = (publish = true) => {
    if (!form.name.trim()) return
    mutation.mutate(formToPayload(form, publish))
  }

  const setField =
    (key: StringField) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      setSaveMsg('idle')
      setForm(prev => ({ ...prev, [key]: e.target.value }))
    }

  const handleTagKey =
    (list: 'techStack' | 'perks', value: string, clear: () => void) =>
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key !== 'Enter' || !value.trim()) return
      e.preventDefault()
      setForm(prev => ({ ...prev, [list]: [...prev[list], value.trim()] }))
      clear()
    }

  const removeTag = (list: 'techStack' | 'perks', idx: number) =>
    setForm(prev => ({ ...prev, [list]: prev[list].filter((_, i) => i !== idx) }))

  const isDirty = JSON.stringify(form) !== JSON.stringify(savedForm)

  const completionItems = [
    { label: 'Tên công ty', done: !!form.name, icon: 'ti-building' },
    { label: 'Ngành nghề & quy mô', done: !!form.industry && !!form.sizeRange, icon: 'ti-chart-bar' },
    { label: 'Mô tả công ty', done: !!form.shortDesc, icon: 'ti-file-text' },
    { label: 'Địa chỉ văn phòng', done: !!form.address, icon: 'ti-map-pin' },
    { label: 'Tech stack', done: form.techStack.length > 0, icon: 'ti-code' },
    { label: 'Logo công ty', done: !!form.logoUrl, icon: 'ti-photo' },
    { label: 'Ảnh bìa', done: !!form.coverUrl, icon: 'ti-photo' },
    { label: 'LinkedIn', done: !!form.linkedinUrl, icon: 'ti-brand-linkedin' },
  ]
  const completionPct = Math.round(
    (completionItems.filter(i => i.done).length / completionItems.length) * 100,
  )

  const steps = [
    { label: 'Thông tin cơ bản', done: !!(form.name && form.industry) },
    { label: 'Giới thiệu & văn hoá', done: !!(form.shortDesc && form.fullDesc) },
    { label: 'Liên hệ & mạng xã hội', done: !!form.address },
    { label: 'Hình ảnh & thương hiệu', done: !!(form.logoUrl || form.coverUrl) },
  ]
  const firstPending = steps.findIndex(s => !s.done)
  const activeStep = firstPending === -1 ? steps.length : firstPending

  const companyInitial = form.name ? form.name.charAt(0).toUpperCase() : 'C'

  const saveBtnLabel = mutation.isPending
    ? 'Đang lưu…'
    : saveMsg === 'saved'
      ? 'Đã lưu ✓'
      : 'Lưu & xuất bản'

  const topActions = (
    <div className="rcp-topbar-actions">
      {mode === 'edit' ? (
        <button className="rcp-btn-mode" onClick={() => setMode('preview')}>
          <i className="ti ti-eye" /> Xem trước
        </button>
      ) : (
        <button className="rcp-btn-ghost" onClick={() => setMode('edit')}>
          <i className="ti ti-edit" /> Chỉnh sửa
        </button>
      )}
      <button
        className="rcp-btn-save"
        onClick={() => handleSave(true)}
        disabled={mutation.isPending || !form.name.trim()}
      >
        <i className="ti ti-device-floppy" /> {saveBtnLabel}
      </button>
    </div>
  )

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="rcp-loading">
          <i className="ti ti-loader-2 rcp-spin" />
          <span>Đang tải hồ sơ công ty…</span>
        </div>
      </DashboardLayout>
    )
  }

  if (mode === 'preview') {
    return (
      <DashboardLayout actions={topActions}>
        <div className="rcp-preview">
          <div className="rcp-pv-bar">
            <div>
              <div className="rcp-pv-bar-title">Xem trước trang công ty</div>
              <div className="rcp-pv-bar-sub">
                Đây là giao diện ứng viên sẽ thấy khi tìm hiểu về công ty bạn.
              </div>
            </div>
            <div className="rcp-pv-bar-actions">
              <button className="rcp-btn-ghost" onClick={() => setMode('edit')}>
                <i className="ti ti-arrow-left" /> Quay lại chỉnh sửa
              </button>
              <button
                className="rcp-btn-save"
                onClick={() => handleSave(true)}
                disabled={mutation.isPending || !form.name.trim()}
              >
                <i className="ti ti-device-floppy" /> {saveBtnLabel}
              </button>
            </div>
          </div>

          <div className="rcp-pv-wrapper">
            <div className="rcp-pv-cover">
              <div className="rcp-pv-cover-overlay" />
              <button className="rcp-pv-cover-edit" onClick={() => setMode('edit')}>
                <i className="ti ti-camera" /> Đổi ảnh bìa
              </button>
            </div>

            <div className="rcp-pv-head">
              <div className="rcp-pv-logo">{companyInitial}</div>
              <div className="rcp-pv-head-info">
                <div className="rcp-pv-name">{form.name || 'Tên công ty'}</div>
                {form.tagline && <div className="rcp-pv-tagline">{form.tagline}</div>}
                <div className="rcp-pv-meta">
                  {form.industry && (
                    <span>
                      <i className="ti ti-briefcase" /> {form.industry}
                    </span>
                  )}
                  {form.sizeRange && (
                    <span>
                      <i className="ti ti-users" /> {SIZE_LABELS[form.sizeRange] ?? form.sizeRange}
                    </span>
                  )}
                  {form.city && (
                    <span>
                      <i className="ti ti-map-pin" /> {form.city}
                    </span>
                  )}
                  {form.foundedYear && (
                    <span>
                      <i className="ti ti-calendar" /> Thành lập {form.foundedYear}
                    </span>
                  )}
                  {form.website && (
                    <span>
                      <i className="ti ti-globe" />{' '}
                      <a href={form.website} target="_blank" rel="noreferrer">
                        {form.website.replace('https://', '').replace('http://', '')}
                      </a>
                    </span>
                  )}
                </div>
              </div>
              <div className="rcp-pv-head-right">
                <button className="rcp-pv-cta">Xem việc làm đang tuyển</button>
                <div className="rcp-pv-social">
                  {form.linkedinUrl && (
                    <a
                      className="rcp-pv-social-btn"
                      href={form.linkedinUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <i className="ti ti-brand-linkedin" style={{ color: '#0A66C2' }} />
                    </a>
                  )}
                  {form.facebookUrl && (
                    <a
                      className="rcp-pv-social-btn"
                      href={form.facebookUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <i className="ti ti-brand-facebook" style={{ color: '#1877F2' }} />
                    </a>
                  )}
                  <div className="rcp-pv-social-btn">
                    <i className="ti ti-share" />
                  </div>
                </div>
              </div>
            </div>

            <div className="rcp-pv-body">
              <div className="rcp-pv-left">
                {form.fullDesc && (
                  <div className="rcp-pv-section">
                    <div className="rcp-pv-sec-title">
                      <i className="ti ti-info-circle" /> Về chúng tôi
                    </div>
                    {form.fullDesc.split('\n\n').map((para, i) => (
                      <p key={i} className="rcp-pv-text">
                        {para}
                      </p>
                    ))}
                  </div>
                )}

                {form.techStack.length > 0 && (
                  <div className="rcp-pv-section">
                    <div className="rcp-pv-sec-title">
                      <i className="ti ti-code" /> Công nghệ sử dụng
                    </div>
                    <div className="rcp-pv-tags">
                      {form.techStack.map((t, i) => (
                        <span key={i} className="rcp-pv-tech-tag">
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {form.perks.length > 0 && (
                  <div className="rcp-pv-section">
                    <div className="rcp-pv-sec-title">
                      <i className="ti ti-heart" /> Phúc lợi nổi bật
                    </div>
                    <div className="rcp-pv-perks">
                      {form.perks.map((perk, i) => (
                        <div key={i} className="rcp-pv-perk">
                          <i className="ti ti-check rcp-pv-perk-icon" />
                          {perk}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="rcp-pv-section">
                  <div className="rcp-pv-sec-title">
                    <i className="ti ti-briefcase" /> Việc làm đang tuyển
                  </div>
                  <div className="rcp-pv-jobs-empty">
                    <i className="ti ti-briefcase-off" />
                    <span>
                      Chưa có tin tuyển dụng nào. Tạo JD và gán công ty này để hiển thị tại đây.
                    </span>
                  </div>
                </div>
              </div>

              <div className="rcp-pv-right">
                <div className="rcp-pv-section">
                  <div className="rcp-pv-sec-title">
                    <i className="ti ti-building" /> Thông tin công ty
                  </div>
                  <div className="rcp-pv-info">
                    {form.industry && (
                      <div className="rcp-pv-info-row">
                        <i className="ti ti-briefcase" />
                        <div>
                          <div className="rcp-pv-info-label">Ngành nghề</div>
                          <div>{form.industry}</div>
                        </div>
                      </div>
                    )}
                    {form.sizeRange && (
                      <div className="rcp-pv-info-row">
                        <i className="ti ti-users" />
                        <div>
                          <div className="rcp-pv-info-label">Quy mô</div>
                          <div>{SIZE_LABELS[form.sizeRange]}</div>
                        </div>
                      </div>
                    )}
                    {form.foundedYear && (
                      <div className="rcp-pv-info-row">
                        <i className="ti ti-calendar" />
                        <div>
                          <div className="rcp-pv-info-label">Thành lập</div>
                          <div>{form.foundedYear}</div>
                        </div>
                      </div>
                    )}
                    {form.companyType && (
                      <div className="rcp-pv-info-row">
                        <i className="ti ti-building-bank" />
                        <div>
                          <div className="rcp-pv-info-label">Loại hình</div>
                          <div>{TYPE_LABELS[form.companyType]}</div>
                        </div>
                      </div>
                    )}
                    {form.workModel && (
                      <div className="rcp-pv-info-row">
                        <i className="ti ti-home" />
                        <div>
                          <div className="rcp-pv-info-label">Mô hình</div>
                          <div>{MODEL_LABELS[form.workModel]}</div>
                        </div>
                      </div>
                    )}
                    {form.address && (
                      <div className="rcp-pv-info-row">
                        <i className="ti ti-map-pin" />
                        <div>
                          <div className="rcp-pv-info-label">Địa chỉ</div>
                          <div>{form.address}</div>
                        </div>
                      </div>
                    )}
                    {form.website && (
                      <div className="rcp-pv-info-row">
                        <i className="ti ti-globe" />
                        <div>
                          <div className="rcp-pv-info-label">Website</div>
                          <div>
                            <a href={form.website} target="_blank" rel="noreferrer">
                              {form.website}
                            </a>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="rcp-pv-section rcp-pv-follow">
                  <div className="rcp-pv-follow-title">Quan tâm đến công ty này?</div>
                  <div className="rcp-pv-follow-sub">
                    Theo dõi để nhận thông báo về tin tuyển dụng mới nhất.
                  </div>
                  <button className="rcp-pv-follow-btn">
                    <i className="ti ti-bell" /> Theo dõi công ty
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout actions={topActions}>
      <div className="rcp-page">
        {/* Stepper */}
        <div className="rcp-stepper">
          {steps.map((step, i) => {
            const isDone = step.done
            const isCurr = i === activeStep
            return (
              <>
                <div key={`step-${i}`} className="rcp-step">
                  <div
                    className={`rcp-step-dot${isDone ? ' done' : isCurr ? ' curr' : ' pend'}`}
                  >
                    {isDone ? <i className="ti ti-check" /> : i + 1}
                  </div>
                  <span className={`rcp-step-label${isCurr ? ' active' : ''}`}>
                    {step.label}
                  </span>
                </div>
                {i < steps.length - 1 && (
                  <div key={`line-${i}`} className={`rcp-step-line${isDone ? ' done' : ''}`} />
                )}
              </>
            )
          })}
        </div>

        {/* 2-col grid */}
        <div className="rcp-layout">
          {/* ── LEFT: Forms ── */}
          <div className="rcp-forms">

            {/* Brand images */}
            <div className="rcp-card">
              <div className="rcp-card-head">
                <div className="rcp-card-icon rcp-icon-indigo">
                  <i className="ti ti-photo" />
                </div>
                <div>
                  <div className="rcp-card-title">Hình ảnh thương hiệu</div>
                  <div className="rcp-card-sub">Logo và ảnh bìa hiển thị trên trang công ty</div>
                </div>
              </div>
              <div className="rcp-card-body">
                <div className="rcp-form-group">
                  <label className="rcp-label">
                    Ảnh bìa{' '}
                    <span className="rcp-hint">Tỉ lệ 16:9 · khuyến nghị 1200×400px</span>
                  </label>
                  <div className="rcp-cover-upload">
                    <i className="ti ti-photo-plus" />
                    <div className="rcp-cover-title">Kéo thả hoặc nhấp để tải ảnh bìa</div>
                    <div className="rcp-cover-hint">PNG, JPG · tối đa 5 MB</div>
                  </div>
                </div>
                <div className="rcp-form-group">
                  <label className="rcp-label">
                    Logo công ty{' '}
                    <span className="rcp-hint">Vuông · khuyến nghị 400×400px</span>
                  </label>
                  <div className="rcp-logo-area">
                    <div className="rcp-logo-preview">
                      <i className="ti ti-building" />
                      <span>Logo</span>
                    </div>
                    <div className="rcp-logo-meta">
                      <div className="rcp-logo-title">Tải lên logo công ty</div>
                      <div className="rcp-logo-hint">
                        Nền trong suốt (PNG) hoặc hình vuông.
                        <br />
                        Kích thước tối thiểu 200×200px, tối đa 2 MB.
                      </div>
                      <div className="rcp-logo-btns">
                        <button className="rcp-btn-upload">
                          <i className="ti ti-upload" /> Tải lên
                        </button>
                        <button className="rcp-btn-remove">Xoá logo</button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Basic info */}
            <div className="rcp-card">
              <div className="rcp-card-head">
                <div className="rcp-card-icon rcp-icon-indigo">
                  <i className="ti ti-building" />
                </div>
                <div>
                  <div className="rcp-card-title">Thông tin cơ bản</div>
                  <div className="rcp-card-sub">Tên, ngành nghề và quy mô công ty</div>
                </div>
              </div>
              <div className="rcp-card-body">
                <div className="rcp-form-row">
                  <div className="rcp-form-group">
                    <label className="rcp-label">
                      Tên công ty <span className="rcp-required">*</span>
                    </label>
                    <input
                      className="rcp-input"
                      value={form.name}
                      onChange={setField('name')}
                      placeholder="Tên công ty của bạn"
                    />
                  </div>
                  <div className="rcp-form-group">
                    <label className="rcp-label">Tên viết tắt / thương hiệu</label>
                    <input
                      className="rcp-input"
                      value={form.shortName}
                      onChange={setField('shortName')}
                      placeholder="VD: Google, Samsung…"
                    />
                  </div>
                </div>
                <div className="rcp-form-row">
                  <div className="rcp-form-group">
                    <label className="rcp-label">
                      Ngành nghề <span className="rcp-required">*</span>
                    </label>
                    <select
                      className="rcp-select"
                      value={form.industry}
                      onChange={setField('industry')}
                    >
                      <option value="">-- Chọn ngành --</option>
                      <option>Công nghệ thông tin</option>
                      <option>Tài chính - Ngân hàng</option>
                      <option>Thương mại điện tử</option>
                      <option>Giáo dục</option>
                      <option>Y tế</option>
                      <option>Bất động sản</option>
                      <option>Sản xuất</option>
                      <option>Khác</option>
                    </select>
                  </div>
                  <div className="rcp-form-group">
                    <label className="rcp-label">Quy mô nhân sự</label>
                    <select
                      className="rcp-select"
                      value={form.sizeRange}
                      onChange={setField('sizeRange')}
                    >
                      <option value="">-- Chọn quy mô --</option>
                      <option value="1-10">1–10 nhân viên</option>
                      <option value="11-50">11–50 nhân viên</option>
                      <option value="51-200">51–200 nhân viên</option>
                      <option value="201-500">201–500 nhân viên</option>
                      <option value="501-1000">501–1000 nhân viên</option>
                      <option value="1000+">1000+ nhân viên</option>
                    </select>
                  </div>
                </div>
                <div className="rcp-form-row">
                  <div className="rcp-form-group">
                    <label className="rcp-label">Năm thành lập</label>
                    <input
                      className="rcp-input"
                      value={form.foundedYear}
                      onChange={setField('foundedYear')}
                      placeholder="VD: 2018"
                    />
                  </div>
                  <div className="rcp-form-group">
                    <label className="rcp-label">Loại hình công ty</label>
                    <select
                      className="rcp-select"
                      value={form.companyType}
                      onChange={setField('companyType')}
                    >
                      <option value="">-- Chọn loại hình --</option>
                      <option value="tnhh">Công ty TNHH</option>
                      <option value="co_phan">Công ty Cổ phần</option>
                      <option value="startup">Startup</option>
                      <option value="tap_doan">Tập đoàn</option>
                      <option value="fdi">Nước ngoài / FDI</option>
                    </select>
                  </div>
                </div>
                <div className="rcp-form-group">
                  <label className="rcp-label">Câu slogan / tagline</label>
                  <input
                    className="rcp-input"
                    value={form.tagline}
                    onChange={setField('tagline')}
                    placeholder="Một câu ngắn mô tả sứ mệnh công ty"
                  />
                </div>
              </div>
            </div>

            {/* About */}
            <div className="rcp-card">
              <div className="rcp-card-head">
                <div className="rcp-card-icon rcp-icon-teal">
                  <i className="ti ti-file-text" />
                </div>
                <div>
                  <div className="rcp-card-title">Giới thiệu công ty</div>
                  <div className="rcp-card-sub">Ứng viên đọc phần này để hiểu về công ty bạn</div>
                </div>
              </div>
              <div className="rcp-card-body">
                <div className="rcp-form-group">
                  <label className="rcp-label">
                    Mô tả ngắn <span className="rcp-required">*</span>
                    <span className="rcp-hint"> Hiển thị trong kết quả tìm kiếm</span>
                  </label>
                  <textarea
                    className="rcp-textarea"
                    rows={2}
                    value={form.shortDesc}
                    onChange={setField('shortDesc')}
                    placeholder="1–2 câu tóm tắt về công ty bạn…"
                    maxLength={500}
                  />
                  <div className="rcp-char-count">{form.shortDesc.length} / 500 ký tự</div>
                </div>
                <div className="rcp-form-group">
                  <label className="rcp-label">
                    Giới thiệu đầy đủ <span className="rcp-required">*</span>
                  </label>
                  <textarea
                    className="rcp-textarea"
                    rows={7}
                    value={form.fullDesc}
                    onChange={setField('fullDesc')}
                    placeholder="Kể câu chuyện công ty: lịch sử, sứ mệnh, tầm nhìn, văn hoá làm việc…"
                    maxLength={3000}
                  />
                  <div className="rcp-char-count">{form.fullDesc.length} / 3000 ký tự</div>
                </div>
              </div>
            </div>

            {/* Culture & Perks */}
            <div className="rcp-card">
              <div className="rcp-card-head">
                <div className="rcp-card-icon rcp-icon-amber">
                  <i className="ti ti-heart" />
                </div>
                <div>
                  <div className="rcp-card-title">Văn hoá & phúc lợi</div>
                  <div className="rcp-card-sub">Điểm thu hút ứng viên tài năng</div>
                </div>
              </div>
              <div className="rcp-card-body">
                <div className="rcp-form-group">
                  <label className="rcp-label">
                    Công nghệ / Tech stack
                    <span className="rcp-hint"> Nhấn Enter để thêm tag</span>
                  </label>
                  <div className="rcp-tag-wrap">
                    {form.techStack.map((tag, i) => (
                      <span key={i} className="rcp-tag rcp-tag--indigo">
                        {tag}
                        <span className="rcp-tag-x" onClick={() => removeTag('techStack', i)}>
                          ×
                        </span>
                      </span>
                    ))}
                    <input
                      className="rcp-tag-input"
                      value={techInput}
                      onChange={e => setTechInput(e.target.value)}
                      onKeyDown={handleTagKey('techStack', techInput, () => setTechInput(''))}
                      placeholder="Thêm công nghệ…"
                    />
                  </div>
                </div>
                <div className="rcp-form-group">
                  <label className="rcp-label">
                    Phúc lợi nổi bật
                    <span className="rcp-hint"> Nhấn Enter để thêm</span>
                  </label>
                  <div className="rcp-tag-wrap">
                    {form.perks.map((tag, i) => (
                      <span key={i} className="rcp-tag rcp-tag--teal">
                        {tag}
                        <span className="rcp-tag-x" onClick={() => removeTag('perks', i)}>
                          ×
                        </span>
                      </span>
                    ))}
                    <input
                      className="rcp-tag-input"
                      value={perkInput}
                      onChange={e => setPerkInput(e.target.value)}
                      onKeyDown={handleTagKey('perks', perkInput, () => setPerkInput(''))}
                      placeholder="Thêm phúc lợi…"
                    />
                  </div>
                </div>
                <div className="rcp-form-row">
                  <div className="rcp-form-group">
                    <label className="rcp-label">Mô hình làm việc</label>
                    <select
                      className="rcp-select"
                      value={form.workModel}
                      onChange={setField('workModel')}
                    >
                      <option value="">-- Chọn mô hình --</option>
                      <option value="onsite">Tại văn phòng</option>
                      <option value="hybrid">Hybrid (văn phòng + remote)</option>
                      <option value="remote">Remote 100%</option>
                    </select>
                  </div>
                  <div className="rcp-form-group">
                    <label className="rcp-label">Ngôn ngữ làm việc</label>
                    <select
                      className="rcp-select"
                      value={form.workLanguage}
                      onChange={setField('workLanguage')}
                    >
                      <option value="">-- Chọn ngôn ngữ --</option>
                      <option>Tiếng Việt</option>
                      <option>Tiếng Anh</option>
                      <option>Tiếng Việt + Tiếng Anh</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Contact */}
            <div className="rcp-card">
              <div className="rcp-card-head">
                <div className="rcp-card-icon rcp-icon-teal">
                  <i className="ti ti-map-pin" />
                </div>
                <div>
                  <div className="rcp-card-title">Địa chỉ & liên hệ</div>
                  <div className="rcp-card-sub">Thông tin liên lạc và vị trí văn phòng</div>
                </div>
              </div>
              <div className="rcp-card-body">
                <div className="rcp-form-group">
                  <label className="rcp-label">Địa chỉ văn phòng chính</label>
                  <input
                    className="rcp-input"
                    value={form.address}
                    onChange={setField('address')}
                    placeholder="Số nhà, đường, phường, quận, thành phố"
                  />
                </div>
                <div className="rcp-form-row">
                  <div className="rcp-form-group">
                    <label className="rcp-label">Tỉnh / Thành phố</label>
                    <select
                      className="rcp-select"
                      value={form.city}
                      onChange={setField('city')}
                    >
                      <option value="">-- Chọn thành phố --</option>
                      <option>Hà Nội</option>
                      <option>TP. Hồ Chí Minh</option>
                      <option>Đà Nẵng</option>
                      <option>Khác</option>
                    </select>
                  </div>
                  <div className="rcp-form-group">
                    <label className="rcp-label">Website</label>
                    <input
                      className="rcp-input"
                      type="url"
                      value={form.website}
                      onChange={setField('website')}
                      placeholder="https://…"
                    />
                  </div>
                </div>
                <div className="rcp-divider">Mạng xã hội</div>
                <div className="rcp-form-group">
                  <label className="rcp-label">LinkedIn</label>
                  <div className="rcp-social-row">
                    <div className="rcp-social-icon rcp-social-li">
                      <i className="ti ti-brand-linkedin" />
                    </div>
                    <input
                      className="rcp-input"
                      type="url"
                      value={form.linkedinUrl}
                      onChange={setField('linkedinUrl')}
                      placeholder="https://linkedin.com/company/…"
                    />
                  </div>
                </div>
                <div className="rcp-form-group">
                  <label className="rcp-label">Facebook</label>
                  <div className="rcp-social-row">
                    <div className="rcp-social-icon rcp-social-fb">
                      <i className="ti ti-brand-facebook" />
                    </div>
                    <input
                      className="rcp-input"
                      type="url"
                      value={form.facebookUrl}
                      onChange={setField('facebookUrl')}
                      placeholder="https://facebook.com/…"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── RIGHT: Side panel ── */}
          <div className="rcp-side-panel">

            {/* Completion meter */}
            <div className="rcp-card">
              <div className="rcp-card-head">
                <div className="rcp-card-icon rcp-icon-teal">
                  <i className="ti ti-chart-pie" />
                </div>
                <div>
                  <div className="rcp-card-title">Mức độ hoàn thiện</div>
                </div>
              </div>
              <div className="rcp-card-body">
                <div className="rcp-completion-header">
                  <span className="rcp-completion-pct">{completionPct}%</span>
                  <span className="rcp-completion-label">hồ sơ đã điền</span>
                </div>
                <div className="rcp-bar">
                  <div className="rcp-bar-fill" style={{ width: `${completionPct}%` }} />
                </div>
                <div className="rcp-alert-info">
                  <i className="ti ti-info-circle" />
                  Hồ sơ trên 90% được ưu tiên hiển thị cho ứng viên và tăng tỷ lệ ứng tuyển lên
                  đến <strong>3×</strong>.
                </div>
                <div className="rcp-checklist">
                  {completionItems.map((item, i) => (
                    <div key={i} className={`rcp-check-item${item.done ? ' done' : ''}`}>
                      <div className={`rcp-check-dot${item.done ? ' done' : ''}`}>
                        <i className={`ti ${item.done ? 'ti-check' : item.icon}`} />
                      </div>
                      {item.label}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Mini preview */}
            <div className="rcp-card rcp-mini-card">
              <div className="rcp-mini-header">Xem trước (ứng viên thấy)</div>
              <div className="rcp-mini-cover">
                <div className="rcp-mini-logo">{companyInitial}</div>
              </div>
              <div className="rcp-mini-body">
                <div className="rcp-mini-name">{form.name || 'Tên công ty'}</div>
                <div className="rcp-mini-industry">
                  {form.industry || '—'}
                  {form.companyType ? ` · ${TYPE_LABELS[form.companyType]}` : ''}
                </div>
                <div className="rcp-mini-meta">
                  {form.city && (
                    <span>
                      <i className="ti ti-map-pin" /> {form.city}
                    </span>
                  )}
                  {form.sizeRange && (
                    <span>
                      <i className="ti ti-users" /> {form.sizeRange}
                    </span>
                  )}
                  {form.foundedYear && (
                    <span>
                      <i className="ti ti-calendar" /> {form.foundedYear}
                    </span>
                  )}
                </div>
                {form.shortDesc && <div className="rcp-mini-desc">{form.shortDesc}</div>}
                {form.techStack.length > 0 && (
                  <div className="rcp-mini-tags">
                    {form.techStack.slice(0, 4).map((t, i) => (
                      <span key={i} className="rcp-mini-tag">
                        {t}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className="rcp-mini-footer">
                <button className="rcp-btn-full-preview" onClick={() => setMode('preview')}>
                  <i className="ti ti-external-link" /> Xem toàn trang
                </button>
              </div>
            </div>

            {/* Tips */}
            <div className="rcp-card">
              <div className="rcp-card-head">
                <div className="rcp-card-icon rcp-icon-amber">
                  <i className="ti ti-bulb" />
                </div>
                <div>
                  <div className="rcp-card-title">Mẹo tối ưu hồ sơ</div>
                </div>
              </div>
              <div className="rcp-card-body rcp-tips">
                <div className="rcp-tip">
                  <i className="ti ti-bulb rcp-tip-icon" />
                  Thêm ảnh bìa thực tế từ văn phòng hoặc team event để tạo ấn tượng đầu tiên.
                </div>
                <div className="rcp-tip">
                  <i className="ti ti-bulb rcp-tip-icon" />
                  Mô tả văn hoá làm việc cụ thể thay vì chỉ liệt kê phúc lợi — ứng viên gen Z
                  đặc biệt quan tâm.
                </div>
                <div className="rcp-tip">
                  <i className="ti ti-bulb rcp-tip-icon" />
                  Cập nhật tech stack giúp lọc đúng ứng viên phù hợp và tăng chất lượng CV nhận
                  được.
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* Sticky save bar */}
        <div className="rcp-save-bar">
          <div className="rcp-save-hint">
            {mutation.isPending ? (
              <><i className="ti ti-loader-2 rcp-spin" /> Đang lưu…</>
            ) : saveMsg === 'saved' ? (
              <><i className="ti ti-circle-check" style={{ color: 'var(--success-600)' }} /> Đã lưu thành công</>
            ) : saveMsg === 'error' ? (
              <><i className="ti ti-alert-circle" style={{ color: 'var(--error-600)' }} /> Lưu thất bại, thử lại</>
            ) : isDirty ? (
              <><i className="ti ti-clock" /> Có thay đổi chưa lưu</>
            ) : (
              <><i className="ti ti-check" /> Đã đồng bộ</>
            )}
          </div>
          <div className="rcp-save-actions">
            <button
              className="rcp-btn-ghost"
              onClick={() => { setForm(savedForm); setSaveMsg('idle') }}
              disabled={!isDirty || mutation.isPending}
            >
              Huỷ thay đổi
            </button>
            <button
              className="rcp-btn-save"
              onClick={() => handleSave(true)}
              disabled={mutation.isPending || !form.name.trim()}
            >
              <i className="ti ti-device-floppy" /> {saveBtnLabel}
            </button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
