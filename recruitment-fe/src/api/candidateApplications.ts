import { apiClient } from './client'
import type { ApplicationStatus } from './applications'

export type MatchRecommendation = 'strong_match' | 'good_match' | 'partial_match' | 'poor_match'
export type InterviewSessionStatus = 'pending' | 'in_progress' | 'completed' | 'timeout'
export type ScheduleStatus = 'pending' | 'confirmed' | 'cancelled'

export interface MyApplicationListItem {
  applicationId: string
  appliedAt: string
  updatedAt: string
  status: ApplicationStatus
  job: {
    id: string
    title: string
    department: string | null
    level: string | null
    location: string | null
    workModel: string | null
    salaryRange: string | null
    company: { name: string; logoUrl: string | null } | null
  }
  matching: { overallScore: number | null; recommendation: MatchRecommendation | null } | null
  interview: { status: InterviewSessionStatus | null; overallScore: number | null } | null
  schedule: {
    status: ScheduleStatus | null
    confirmedStartTime: string | null
    meetLink: string | null
  } | null
  autoRejected?: true
}

export interface StatusHistoryItem {
  fromStatus: ApplicationStatus | null
  toStatus: ApplicationStatus
  changedAt: string
  label: string
}

export interface MyApplicationDetail extends MyApplicationListItem {
  statusHistory: StatusHistoryItem[]
}

export interface GetMyApplicationsParams {
  status?: ApplicationStatus
  page?: number
  limit?: number
}

export interface GetMyApplicationsResponse {
  data: MyApplicationListItem[]
  meta: {
    total: number
    page: number
    limit: number
    totalPages: number
  }
}

export async function getMyApplications(
  params?: GetMyApplicationsParams,
): Promise<GetMyApplicationsResponse> {
  const { data } = await apiClient.get<GetMyApplicationsResponse>('/candidate/applications', { params })
  return data
}

export async function getMyApplicationDetail(applicationId: string): Promise<MyApplicationDetail> {
  const { data } = await apiClient.get<MyApplicationDetail>(`/candidate/applications/${applicationId}`)
  return data
}
