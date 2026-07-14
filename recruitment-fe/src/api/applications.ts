import { apiClient } from './client'

export type ApplicationStatus =
  | 'pending'
  | 'matched'
  | 'interviewed'
  | 'schedule_sent'
  | 'scheduled'
  | 'completed'
  | 'hired'
  | 'rejected'

export interface ApplicationStatusResponse {
  hasApplied: boolean
  status: ApplicationStatus | null
  appliedAt: string | null
}

export async function getApplicationStatus(jobId: string): Promise<ApplicationStatusResponse> {
  const { data } = await apiClient.get<ApplicationStatusResponse>(`/applications/status/${jobId}`)
  return data
}

export async function applyToJob(jobId: string, file: File): Promise<void> {
  const form = new FormData()
  form.append('jobId', jobId)
  form.append('file', file)
  await apiClient.post('/applications', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
}
