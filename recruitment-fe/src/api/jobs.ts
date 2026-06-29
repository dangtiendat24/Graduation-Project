import { apiClient } from './client'

export interface JobCompany {
  id: string
  name: string
  shortName: string | null
  logoUrl: string | null
  industry: string | null
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
  status: 'draft' | 'active' | 'closed'
  deadline: string | null
  createdAt: string
  updatedAt: string
}

export interface JobSearchParams {
  q?: string
  location?: string
  workModel?: 'onsite' | 'hybrid' | 'remote'
  level?: 'intern' | 'junior' | 'middle' | 'senior' | 'lead' | 'director'
  companyId?: string
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

export async function updateJob(id: string, payload: Partial<CreateJobPayload> & { status?: 'draft' | 'active' | 'closed' }): Promise<Job> {
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
