import { useEffect, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { isAxiosError } from 'axios'
import DashboardLayout from '../../layouts/DashboardLayout/DashboardLayout'
import { useAuthStore } from '../../store/authStore'
import {
  getSettings,
  updateAccount,
  changePassword,
  updateNotificationPreferences,
  updateScoringWeights,
  uploadAvatar,
  removeAvatar,
  type NotificationPreferences,
} from '../../api/settings'
import './RecruiterSettingsPage.css'

const DEFAULT_WEIGHTS_LABEL = 'Kỹ năng 45% · Kinh nghiệm 35% · Học vấn 20%'

function getInitials(name: string): string {
  return name.split(' ').filter(Boolean).map((w) => w[0]).slice(0, 2).join('').toUpperCase()
}

interface AccountForm {
  fullName: string
  phone: string
}

interface PasswordForm {
  currentPassword: string
  newPassword: string
  confirmPassword: string
}

const EMPTY_PASSWORD_FORM: PasswordForm = {
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
}

function errorMessage(err: unknown, fallback: string): string {
  if (isAxiosError(err)) {
    return (err.response?.data as { message?: string })?.message ?? fallback
  }
  return fallback
}

export default function RecruiterSettingsPage() {
  const queryClient = useQueryClient()
  const { user, token, setAuth } = useAuthStore()

  const { data, isLoading } = useQuery({ queryKey: ['settings'], queryFn: getSettings })

  // ── Account ──────────────────────────────────────────────
  const [accountForm, setAccountForm] = useState<AccountForm>({ fullName: '', phone: '' })
  const [accountMsg, setAccountMsg] = useState<'idle' | 'saved' | 'error'>('idle')

  useEffect(() => {
    if (data) {
      setAccountForm({ fullName: data.fullName, phone: data.phone ?? '' })
    }
  }, [data])

  function syncAuthUser(saved: { fullName: string; avatarUrl: string | null }) {
    if (user && token) {
      setAuth({ ...user, fullName: saved.fullName, avatarUrl: saved.avatarUrl }, token)
    }
  }

  const accountMutation = useMutation({
    mutationFn: () =>
      updateAccount({
        fullName: accountForm.fullName,
        phone: accountForm.phone || undefined,
      }),
    onSuccess: (saved) => {
      queryClient.setQueryData(['settings'], saved)
      setAccountMsg('saved')
      syncAuthUser(saved)
      setTimeout(() => setAccountMsg('idle'), 3000)
    },
    onError: () => {
      setAccountMsg('error')
      setTimeout(() => setAccountMsg('idle'), 4000)
    },
  })

  // ── Avatar ───────────────────────────────────────────────
  const avatarInputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)
  const [avatarError, setAvatarError] = useState('')

  const avatarMutation = useMutation({
    mutationFn: uploadAvatar,
    onSuccess: (saved) => {
      queryClient.setQueryData(['settings'], saved)
      syncAuthUser(saved)
      setAvatarError('')
    },
    onError: (err) => setAvatarError(errorMessage(err, 'Tải ảnh lên thất bại')),
  })

  const avatarRemoveMutation = useMutation({
    mutationFn: removeAvatar,
    onSuccess: (saved) => {
      queryClient.setQueryData(['settings'], saved)
      syncAuthUser(saved)
    },
  })

  function handleAvatarFile(file: File | undefined) {
    if (!file) return
    avatarMutation.mutate(file)
  }

  function handleAvatarInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    handleAvatarFile(e.target.files?.[0])
    e.target.value = ''
  }

  function handleAvatarDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    handleAvatarFile(e.dataTransfer.files?.[0])
  }

  // ── Password ─────────────────────────────────────────────
  const [passwordForm, setPasswordForm] = useState<PasswordForm>(EMPTY_PASSWORD_FORM)
  const [passwordMsg, setPasswordMsg] = useState<'idle' | 'saved' | 'error'>('idle')
  const [passwordError, setPasswordError] = useState('')

  const passwordMutation = useMutation({
    mutationFn: () =>
      changePassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      }),
    onSuccess: () => {
      setPasswordMsg('saved')
      setPasswordForm(EMPTY_PASSWORD_FORM)
      setTimeout(() => setPasswordMsg('idle'), 3000)
    },
    onError: (err) => {
      setPasswordMsg('error')
      setPasswordError(errorMessage(err, 'Đổi mật khẩu thất bại'))
    },
  })

  function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault()
    setPasswordError('')
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError('Mật khẩu xác nhận không khớp')
      return
    }
    passwordMutation.mutate()
  }

  // ── Notifications ────────────────────────────────────────
  const notificationsMutation = useMutation({
    mutationFn: (prefs: NotificationPreferences) => updateNotificationPreferences(prefs),
    onSuccess: (saved) => queryClient.setQueryData(['settings'], saved),
  })

  function toggleNotification(key: keyof NotificationPreferences) {
    if (!data) return
    notificationsMutation.mutate({ ...data.notificationPreferences, [key]: !data.notificationPreferences[key] })
  }

  // ── Scoring weights (recruiter only) ────────────────────
  const [useCustomWeights, setUseCustomWeights] = useState(false)
  const [weightSkills, setWeightSkills] = useState('45')
  const [weightExperience, setWeightExperience] = useState('35')
  const [weightEducation, setWeightEducation] = useState('20')
  const [weightsMsg, setWeightsMsg] = useState<'idle' | 'saved' | 'error'>('idle')

  useEffect(() => {
    if (data?.defaultScoringWeights) {
      setUseCustomWeights(true)
      setWeightSkills(String(Math.round(data.defaultScoringWeights.skills * 100)))
      setWeightExperience(String(Math.round(data.defaultScoringWeights.experience * 100)))
      setWeightEducation(String(Math.round(data.defaultScoringWeights.education * 100)))
    }
  }, [data])

  const weightsSum =
    (Number(weightSkills) || 0) + (Number(weightExperience) || 0) + (Number(weightEducation) || 0)
  const weightsValid = !useCustomWeights || weightsSum === 100

  const weightsMutation = useMutation({
    mutationFn: () =>
      updateScoringWeights(
        useCustomWeights
          ? {
              skills: (Number(weightSkills) || 0) / 100,
              experience: (Number(weightExperience) || 0) / 100,
              education: (Number(weightEducation) || 0) / 100,
            }
          : null,
      ),
    onSuccess: (saved) => {
      queryClient.setQueryData(['settings'], saved)
      setWeightsMsg('saved')
      setTimeout(() => setWeightsMsg('idle'), 3000)
    },
    onError: () => {
      setWeightsMsg('error')
      setTimeout(() => setWeightsMsg('idle'), 4000)
    },
  })

  if (isLoading || !data) {
    return (
      <DashboardLayout>
        <div className="rst-empty">
          <i className="ti ti-loader-2 rst-spin" /> Đang tải cài đặt…
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="rst-page">
        <div className="rst-page-head">
          <h1>Cài đặt</h1>
          <p>Quản lý tài khoản, thông báo email và trọng số chấm điểm CV mặc định</p>
        </div>

        {/* Account */}
        <section className="rst-card">
          <div className="rst-card-head">
            <div className="rst-card-icon rst-icon-indigo">
              <i className="ti ti-user-circle" />
            </div>
            <div>
              <div className="rst-card-title">Thông tin tài khoản</div>
              <div className="rst-card-sub">Họ tên, số điện thoại và ảnh đại diện hiển thị trong hệ thống</div>
            </div>
          </div>
          <div className="rst-card-body">
            <div className="rst-form-group">
              <label className="rst-label">Ảnh đại diện</label>
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                style={{ display: 'none' }}
                onChange={handleAvatarInputChange}
              />
              <div className="rst-avatar-section">
                <div
                  className={`rst-avatar-drop${dragOver ? ' rst-avatar-drop--over' : ''}`}
                  onClick={() => avatarInputRef.current?.click()}
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleAvatarDrop}
                >
                  {avatarMutation.isPending ? (
                    <i className="ti ti-loader-2 rst-spin" />
                  ) : data.avatarUrl ? (
                    <img src={data.avatarUrl} alt="avatar" className="rst-avatar-img" />
                  ) : (
                    <div className="rst-avatar-fallback">{getInitials(accountForm.fullName || data.fullName)}</div>
                  )}
                  <div className="rst-avatar-cam"><i className="ti ti-camera" /></div>
                </div>
                <div className="rst-avatar-info">
                  <div className="rst-avatar-hint">Kéo thả ảnh vào đây hoặc nhấp để chọn file</div>
                  <div className="rst-avatar-hint rst-avatar-hint--muted">JPEG, PNG hoặc WEBP · tối đa 2 MB</div>
                  {data.avatarUrl && (
                    <button
                      type="button"
                      className="rst-btn-remove"
                      onClick={() => avatarRemoveMutation.mutate()}
                      disabled={avatarRemoveMutation.isPending}
                    >
                      Xoá ảnh
                    </button>
                  )}
                  {avatarError && <div className="rst-hint-error">{avatarError}</div>}
                </div>
              </div>
            </div>
            <div className="rst-form-row">
              <div className="rst-form-group">
                <label className="rst-label">Họ tên</label>
                <input
                  className="rst-input"
                  value={accountForm.fullName}
                  onChange={(e) => setAccountForm((p) => ({ ...p, fullName: e.target.value }))}
                />
              </div>
              <div className="rst-form-group">
                <label className="rst-label">Số điện thoại</label>
                <input
                  className="rst-input"
                  value={accountForm.phone}
                  onChange={(e) => setAccountForm((p) => ({ ...p, phone: e.target.value }))}
                  placeholder="VD: 0901234567"
                />
              </div>
            </div>
            <div className="rst-form-group">
              <label className="rst-label">Email</label>
              <input className="rst-input" value={data.email} disabled />
            </div>
            <div className="rst-card-actions">
              <span className="rst-save-hint">
                {accountMutation.isPending
                  ? 'Đang lưu…'
                  : accountMsg === 'saved'
                    ? 'Đã lưu ✓'
                    : accountMsg === 'error'
                      ? 'Lưu thất bại, thử lại'
                      : ''}
              </span>
              <button
                type="button"
                className="rst-btn-save"
                onClick={() => accountMutation.mutate()}
                disabled={accountMutation.isPending || !accountForm.fullName.trim()}
              >
                <i className="ti ti-device-floppy" /> Lưu thông tin
              </button>
            </div>
          </div>
        </section>

        {/* Password */}
        <section className="rst-card">
          <div className="rst-card-head">
            <div className="rst-card-icon rst-icon-amber">
              <i className="ti ti-lock" />
            </div>
            <div>
              <div className="rst-card-title">Đổi mật khẩu</div>
              <div className="rst-card-sub">
                {data.hasPassword
                  ? 'Mật khẩu mới tối thiểu 8 ký tự'
                  : 'Tài khoản đăng nhập bằng Google, không thể đổi mật khẩu ở đây'}
              </div>
            </div>
          </div>
          {data.hasPassword && (
            <form className="rst-card-body" onSubmit={handlePasswordSubmit}>
              <div className="rst-form-group">
                <label className="rst-label">Mật khẩu hiện tại</label>
                <input
                  className="rst-input"
                  type="password"
                  value={passwordForm.currentPassword}
                  onChange={(e) => setPasswordForm((p) => ({ ...p, currentPassword: e.target.value }))}
                  required
                />
              </div>
              <div className="rst-form-row">
                <div className="rst-form-group">
                  <label className="rst-label">Mật khẩu mới</label>
                  <input
                    className="rst-input"
                    type="password"
                    value={passwordForm.newPassword}
                    onChange={(e) => setPasswordForm((p) => ({ ...p, newPassword: e.target.value }))}
                    minLength={8}
                    required
                  />
                </div>
                <div className="rst-form-group">
                  <label className="rst-label">Xác nhận mật khẩu mới</label>
                  <input
                    className="rst-input"
                    type="password"
                    value={passwordForm.confirmPassword}
                    onChange={(e) => setPasswordForm((p) => ({ ...p, confirmPassword: e.target.value }))}
                    minLength={8}
                    required
                  />
                </div>
              </div>
              {passwordError && <div className="rst-hint-error">{passwordError}</div>}
              <div className="rst-card-actions">
                <span className="rst-save-hint">
                  {passwordMutation.isPending ? 'Đang lưu…' : passwordMsg === 'saved' ? 'Đã đổi mật khẩu ✓' : ''}
                </span>
                <button type="submit" className="rst-btn-save" disabled={passwordMutation.isPending}>
                  <i className="ti ti-device-floppy" /> Đổi mật khẩu
                </button>
              </div>
            </form>
          )}
        </section>

        {/* Notifications */}
        <section className="rst-card">
          <div className="rst-card-head">
            <div className="rst-card-icon rst-icon-teal">
              <i className="ti ti-bell" />
            </div>
            <div>
              <div className="rst-card-title">Thông báo email</div>
              <div className="rst-card-sub">Chọn sự kiện bạn muốn nhận email thông báo</div>
            </div>
          </div>
          <div className="rst-card-body">
            <label className="rst-toggle-row">
              <div>
                <div className="rst-toggle-title">Ứng viên mới nộp CV</div>
                <div className="rst-toggle-sub">
                  Email khi có ứng viên nộp CV vào 1 trong các tin tuyển dụng của bạn
                </div>
              </div>
              <input
                type="checkbox"
                checked={data.notificationPreferences.newApplication}
                onChange={() => toggleNotification('newApplication')}
              />
            </label>
            <label className="rst-toggle-row">
              <div>
                <div className="rst-toggle-title">Ứng viên xác nhận lịch phỏng vấn</div>
                <div className="rst-toggle-sub">Email khi ứng viên chọn khung giờ phỏng vấn</div>
              </div>
              <input
                type="checkbox"
                checked={data.notificationPreferences.scheduleConfirmed}
                onChange={() => toggleNotification('scheduleConfirmed')}
              />
            </label>
            <label className="rst-toggle-row">
              <div>
                <div className="rst-toggle-title">AI chấm điểm CV xong</div>
                <div className="rst-toggle-sub">Email khi AI hoàn tất chấm điểm phù hợp cho 1 ứng viên</div>
              </div>
              <input
                type="checkbox"
                checked={data.notificationPreferences.matchingComplete}
                onChange={() => toggleNotification('matchingComplete')}
              />
            </label>
          </div>
        </section>

        {/* Scoring weights — recruiter only */}
        {data.role === 'recruiter' && (
          <section className="rst-card">
            <div className="rst-card-head">
              <div className="rst-card-icon rst-icon-indigo">
                <i className="ti ti-adjustments" />
              </div>
              <div>
                <div className="rst-card-title">Trọng số chấm điểm CV mặc định</div>
                <div className="rst-card-sub">
                  Áp dụng cho tin tuyển dụng mới không tự set trọng số riêng — mặc định hệ thống:{' '}
                  {DEFAULT_WEIGHTS_LABEL}
                </div>
              </div>
            </div>
            <div className="rst-card-body">
              <label className="rst-check-label">
                <input
                  type="checkbox"
                  checked={useCustomWeights}
                  onChange={(e) => setUseCustomWeights(e.target.checked)}
                />
                Đặt trọng số mặc định riêng cho các tin tuyển dụng mới của tôi
              </label>

              {useCustomWeights && (
                <>
                  <div className="rst-form-row rst-form-row--3">
                    <div className="rst-form-group">
                      <label className="rst-label">Kỹ năng (%)</label>
                      <input
                        className="rst-input"
                        type="number"
                        min="0"
                        max="100"
                        value={weightSkills}
                        onChange={(e) => setWeightSkills(e.target.value)}
                      />
                    </div>
                    <div className="rst-form-group">
                      <label className="rst-label">Kinh nghiệm (%)</label>
                      <input
                        className="rst-input"
                        type="number"
                        min="0"
                        max="100"
                        value={weightExperience}
                        onChange={(e) => setWeightExperience(e.target.value)}
                      />
                    </div>
                    <div className="rst-form-group">
                      <label className="rst-label">Học vấn (%)</label>
                      <input
                        className="rst-input"
                        type="number"
                        min="0"
                        max="100"
                        value={weightEducation}
                        onChange={(e) => setWeightEducation(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className={`rst-hint${weightsValid ? '' : ' rst-hint-error'}`}>
                    Tổng: {weightsSum}%{!weightsValid && ' — phải bằng 100%'}
                  </div>
                </>
              )}

              <div className="rst-card-actions">
                <span className="rst-save-hint">
                  {weightsMutation.isPending
                    ? 'Đang lưu…'
                    : weightsMsg === 'saved'
                      ? 'Đã lưu ✓'
                      : weightsMsg === 'error'
                        ? 'Lưu thất bại, thử lại'
                        : ''}
                </span>
                <button
                  type="button"
                  className="rst-btn-save"
                  onClick={() => weightsMutation.mutate()}
                  disabled={weightsMutation.isPending || !weightsValid}
                >
                  <i className="ti ti-device-floppy" /> Lưu trọng số
                </button>
              </div>
            </div>
          </section>
        )}
      </div>
    </DashboardLayout>
  )
}
