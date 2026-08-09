import { apiClient } from './client'
import type { ApplicationStatus } from './candidates'

export interface ScoreBucket {
  range: string
  count: number
}

export interface SkillCount {
  skill: string
  count: number
}

export interface DashboardStats {
  totalScreened: number
  statusFunnel: Record<ApplicationStatus, number>
  avgTimeToInterviewDays: number | null
  scoreDistribution: ScoreBucket[]
  topSkills: SkillCount[]
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const { data } = await apiClient.get<DashboardStats>('/dashboard/stats')
  return data
}
