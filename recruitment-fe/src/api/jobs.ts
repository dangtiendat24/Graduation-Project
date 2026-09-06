import { apiClient } from './client'

export interface JobCompany {
  id: string
  name: string
  shortName: string | null
  logoUrl: string | null
  industry: string | null
}

export interface ScoringWeights {
  skills: number
  experience: number
  education: number
}

export interface Job {
  id: string
  recruiterId: string
  companyId: string | null
  company: JobCompany | null
  title: string
  department: string | null
  level: 'intern' | 'junior' | 'middle' | 'senior' | 'lead' | 'director' | null
  location: string | null
  headcount: number
  workModel: 'onsite' | 'hybrid' | 'remote' | null
  description: string
  requirements: string
  requiredSkills: string[] | null
  minExperience: string | null
  salaryRange: string | null
  jobPerks: string[] | null
  /** 'expired' do hệ thống tự đặt khi quá hạn; 'closed' là recruiter chủ động đóng */
  status: 'draft' | 'active' | 'closed' | 'expired'
  deadline: string | null
  scoringWeights: ScoringWeights | null
  createdAt: string
  updatedAt: string
}

export interface JobSearchParams {
  q?: string
  location?: string
  workModel?: 'onsite' | 'hybrid' | 'remote'
  level?: 'intern' | 'junior' | 'middle' | 'senior' | 'lead' | 'director'
  companyId?: string
  /** Trang công ty bật cờ này để xem thêm tin đã quá hạn; tin recruiter tự đóng vẫn luôn bị ẩn */
  includeExpired?: boolean
}

export interface CreateJobPayload {
  title: string
  description: string
  requirements: string
  department?: string
  level?: string
  location?: string
  headcount?: number
  workModel?: 'onsite' | 'hybrid' | 'remote'
  requiredSkills?: string[]
  minExperience?: string
  salaryRange?: string
  jobPerks?: string[]
  status?: 'draft' | 'active'
  deadline?: string
  /** undefined = giữ nguyên trọng số hiện có; null = xoá override, quay về mặc định */
  scoringWeights?: ScoringWeights | null
}

export async function createJob(payload: CreateJobPayload): Promise<Job> {
  const { data } = await apiClient.post<Job>('/jobs', payload)
  return data
}

export async function getActiveJobs(params?: JobSearchParams): Promise<Job[]> {
  const { data } = await apiClient.get<Job[]>('/jobs', { params })
  return data
}

export async function getMyJobs(): Promise<Job[]> {
  const { data } = await apiClient.get<Job[]>('/jobs/my')
  return data
}

export async function getJob(id: string): Promise<Job> {
  const { data } = await apiClient.get<Job>(`/jobs/${id}`)
  return data
}

export async function updateJob(id: string, payload: Omit<Partial<CreateJobPayload>, 'status'> & { status?: Job['status'] }): Promise<Job> {
  const { data } = await apiClient.patch<Job>(`/jobs/${id}`, payload)
  return data
}

export async function closeJob(id: string): Promise<Job> {
  const { data } = await apiClient.patch<Job>(`/jobs/${id}/close`, {})
  return data
}

export async function deleteJob(id: string): Promise<void> {
  await apiClient.delete(`/jobs/${id}`)
}
