import { apiClient } from './client'
import type { Job } from './jobs'

export interface SavedJobItem extends Job {
  savedAt: string
}

export async function getSavedJobIds(): Promise<string[]> {
  const { data } = await apiClient.get<{ jobIds: string[] }>('/candidate/saved-jobs/ids')
  return data.jobIds
}

export async function getSavedJobs(): Promise<SavedJobItem[]> {
  const { data } = await apiClient.get<SavedJobItem[]>('/candidate/saved-jobs')
  return data
}

export async function saveJob(jobId: string): Promise<void> {
  await apiClient.post(`/candidate/saved-jobs/${jobId}`)
}

export async function unsaveJob(jobId: string): Promise<void> {
  await apiClient.delete(`/candidate/saved-jobs/${jobId}`)
}
