import { apiClient } from './client'

export type AgentName =
  | 'agent1_resume_parser'
  | 'agent2_matching'
  | 'agent3_interview'
  | 'agent4_scheduling'
  | 'agent5_reporting'

export interface RecentAgentError {
  errorMessage: string
  createdAt: string
}

export interface AgentStatsItem {
  agentName: AgentName
  totalExecutions: number
  avgDurationMs: number | null
  successRate: number | null
  recentErrors: RecentAgentError[]
}

export interface AgentActivityItem {
  id: string
  agentName: AgentName
  startedAt: string
  success: boolean
  errorMessage: string | null
  candidateName: string
  jobTitle: string
}

export async function getAgentStats(): Promise<AgentStatsItem[]> {
  const { data } = await apiClient.get<AgentStatsItem[]>('/admin/agent-stats')
  return data
}

export async function getAgentActivity(): Promise<AgentActivityItem[]> {
  const { data } = await apiClient.get<AgentActivityItem[]>('/admin/agent-activity')
  return data
}
