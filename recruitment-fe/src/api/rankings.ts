import { apiClient } from './client'
import type { ApplicationStatus } from './candidates'

export type ScoreBand = 'high' | 'medium' | 'low'

export interface RankingMatchingCriteria {
  skills: number
  experience: number
  education: number
}

export interface JobApplicationMatching {
  overallScore: number | null
  recommendation: 'strong_match' | 'good_match' | 'partial_match' | 'poor_match' | null
  criteria: RankingMatchingCriteria | null
  explanation: string | null
}

export interface JobApplicationListItem {
  applicationId: string
  appliedAt: string
  updatedAt: string
  status: ApplicationStatus
  candidate: {
    id: string
    fullName: string
    email: string
    phone: string | null
    avatarUrl: string | null
  }
  matching: JobApplicationMatching | null
}

export interface GetJobApplicationsResponse {
  data: JobApplicationListItem[]
  meta: {
    total: number
    page: number
    limit: number
    totalPages: number
  }
}

export interface GetJobApplicationsParams {
  sort?: 'score' | 'date'
  scoreBand?: ScoreBand
  page?: number
  limit?: number
}

// Ngưỡng khớp với SCORE_BAND_RANGES ở recruiter-applications.service.ts (BE):
// high >= 80, medium 60-79, low < 60
export function getScoreBand(score: number | null): ScoreBand | null {
  if (score === null) return null
  if (score >= 80) return 'high'
  if (score >= 60) return 'medium'
  return 'low'
}

export async function getJobApplications(
  jobId: string,
  params?: GetJobApplicationsParams,
): Promise<GetJobApplicationsResponse> {
  const { data } = await apiClient.get<GetJobApplicationsResponse>(
    `/jobs/${jobId}/applications`,
    { params },
  )
  return data
}

export async function updateApplicationStatus(
  jobId: string,
  applicationId: string,
  status: 'interviewed' | 'rejected',
): Promise<void> {
  await apiClient.patch(`/jobs/${jobId}/applications/${applicationId}/status`, { status })
}
