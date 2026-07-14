import { apiClient } from './client'

/* ── Types ── */
export interface ResumeData {
  id: string
  candidateId: string
  cvFileName: string
  cvOriginalName: string
  cvUrl: string
  cvSizeBytes: number
  parsedSummary: string | null
  parsedSkills: string[] | null
  parsedExperience: ExperienceItem[] | null
  parsedEducation: EduItem[] | null
  isAnalyzed: boolean
  parseStatus: 'pending' | 'processing' | 'done' | 'error'
  parsedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface ExperienceItem {
  title: string
  company: string
  period: string
  description: string
}

export interface EduItem {
  school: string
  degree: string
  year: string
}

export interface ProfileData {
  id: string
  email: string
  fullName: string
  phone: string | null
  city: string | null
  linkedin: string | null
  github: string | null
  avatarUrl: string | null
  role: string
  resume: ResumeData | null
}

export interface UpdateProfilePayload {
  fullName?: string
  phone?: string
  city?: string
  linkedin?: string
  github?: string
}

/* ── API calls ── */

export async function getMyProfile(): Promise<ProfileData> {
  const { data } = await apiClient.get<ProfileData>('/profile/me')
  return data
}

export async function updateMyProfile(payload: UpdateProfilePayload): Promise<ProfileData> {
  const { data } = await apiClient.patch<ProfileData>('/profile/me', payload)
  return data
}

export async function uploadCV(file: File): Promise<ResumeData> {
  const form = new FormData()
  form.append('file', file)
  const { data } = await apiClient.post<ResumeData>('/profile/me/cv', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return data
}

/* ── helpers ── */

/** Tính % hoàn thiện hồ sơ dựa trên dữ liệu thực */
export function calcCompletionPct(p: ProfileData): number {
  const checks = [
    !!p.fullName,
    !!p.phone,
    !!p.city,
    !!p.linkedin,
    !!p.github,
    !!p.resume,
    p.resume?.isAnalyzed ?? false,
  ]
  return Math.round((checks.filter(Boolean).length / checks.length) * 100)
}

export function calcCompletionItems(p: ProfileData) {
  return [
    { label: 'Họ và tên',            done: !!p.fullName,              icon: 'ti-check' },
    { label: 'Số điện thoại',        done: !!p.phone,                 icon: 'ti-check' },
    { label: 'Thành phố',            done: !!p.city,                  icon: 'ti-map-pin' },
    { label: 'LinkedIn',             done: !!p.linkedin,              icon: 'ti-brand-linkedin' },
    { label: 'GitHub / Portfolio',   done: !!p.github,                icon: 'ti-brand-github' },
    { label: 'CV đã tải lên',        done: !!p.resume,                icon: 'ti-check' },
    { label: 'CV đã được phân tích', done: p.resume?.isAnalyzed ?? false, icon: 'ti-check' },
  ]
}

/** Format bytes → "1.2 MB" */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/** Format ISO date → "17/06/2026" */
export function formatUploadDate(iso: string): string {
  const d = new Date(iso)
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const yyyy = d.getFullYear()
  return `${dd}/${mm}/${yyyy}`
}
