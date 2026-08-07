import { apiClient } from './client'

export interface FunnelStage {
  stage: string
  label: string
  entered: number
  advancedCount: number | null
  rejectedCount: number | null
  stillHere: number | null
  passRate: number | null
  avgProcessingHours: number | null
  directToSchedulingCount?: number
}

export interface ReportsOverviewResponse {
  scope: {
    jobId: string | null
    jobTitle: string | null
    from: string | null
    to: string | null
  }
  headline: {
    totalScreened: number
    hiredCount: number
    rejectedCount: number
    inProgressCount: number
    avgTotalProcessingHours: number | null
  }
  funnel: FunnelStage[]
}

export interface GetReportsOverviewParams {
  jobId?: string
  from?: string
  to?: string
}

export async function getReportsOverview(
  params?: GetReportsOverviewParams,
): Promise<ReportsOverviewResponse> {
  const { data } = await apiClient.get<ReportsOverviewResponse>('/recruiter/reports/overview', {
    params,
  })
  return data
}
