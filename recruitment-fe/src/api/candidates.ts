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

export interface Experience {
  title: string
  company: string
  period: string
  description: string
}

export interface Education {
  school: string
  degree: string
  year: string
}

export interface SkillBreakdown {
  keyword: number
  tfidf: number
  semantic: number
}

export interface MatchingCriteria {
  skills: number
  experience: number
  education: number
  skillBreakdown?: SkillBreakdown
}

export interface CandidateListItem {
  applicationId: string
  appliedAt: string
  status: ApplicationStatus
  candidate: {
    id: string
    fullName: string
    email: string
    phone: string | null
    avatarUrl: string | null
    city: string | null
    linkedinUrl: string | null
    githubUrl: string | null
  }
  parsedData: {
    summary: string | null
    skills: string[]
    experience: Experience[]
    education: Education[]
  } | null
  isParsed: boolean
  cvFileUrl: string | null
  matching: {
    overallScore: number
    recommendation: 'strong_match' | 'good_match' | 'partial_match' | 'poor_match'
    criteria: MatchingCriteria
  } | null
  job: {
    id: string
    title: string
    department: string | null
  }
}

export interface GetCandidatesParams {
  jobId?: string
  status?: ApplicationStatus
  search?: string
  sort?: 'appliedAt' | 'overallScore'
  page?: number
  limit?: number
}

export interface GetCandidatesResponse {
  data: CandidateListItem[]
  meta: {
    total: number
    page: number
    limit: number
    totalPages: number
  }
}

export async function getRecruiterCandidates(
  params?: GetCandidatesParams,
): Promise<GetCandidatesResponse> {
  const { data } = await apiClient.get<GetCandidatesResponse>('/recruiter/candidates', { params })
  return data
}
