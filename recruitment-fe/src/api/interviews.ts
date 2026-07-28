import { apiClient } from './client'

export type InterviewSessionStatus = 'pending' | 'in_progress' | 'completed' | 'timeout' | 'cancelled'
export type InterviewPipelineStatus = 'pending' | 'processing' | 'done' | 'error'
export type InterviewQuestionCategory = 'technical' | 'situational' | 'behavioral'
export type InterviewQuestionDifficulty = 'easy' | 'medium' | 'hard'

export interface InterviewQuestion {
  id: string
  question: string
  category: InterviewQuestionCategory
  difficulty: InterviewQuestionDifficulty
}

export interface InterviewSessionDetail {
  id: string
  applicationId: string
  status: InterviewSessionStatus
  questionsStatus: InterviewPipelineStatus
  questionsError: string | null
  questions: InterviewQuestion[] | null
  scoringStatus: InterviewPipelineStatus
  overallScore: number | null
  answers: { questionId: string; answerText: string }[]
}

export async function getInterviewSession(sessionId: string): Promise<InterviewSessionDetail> {
  const { data } = await apiClient.get<InterviewSessionDetail>(`/interviews/${sessionId}`)
  return data
}

export async function submitInterviewAnswer(
  sessionId: string,
  payload: { questionId: string; answerText: string },
): Promise<void> {
  await apiClient.post(`/interviews/${sessionId}/answer`, payload)
}

export async function completeInterviewSession(sessionId: string): Promise<void> {
  await apiClient.post(`/interviews/${sessionId}/complete`)
}
