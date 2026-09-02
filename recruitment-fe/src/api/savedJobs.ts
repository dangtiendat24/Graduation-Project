import { apiClient } from './client'

export async function getSavedJobIds(): Promise<string[]> {
  const { data } = await apiClient.get<{ jobIds: string[] }>('/candidate/saved-jobs')
  return data.jobIds
}

export async function saveJob(jobId: string): Promise<void> {
  await apiClient.post(`/candidate/saved-jobs/${jobId}`)
}

export async function unsaveJob(jobId: string): Promise<void> {
  await apiClient.delete(`/candidate/saved-jobs/${jobId}`)
}
