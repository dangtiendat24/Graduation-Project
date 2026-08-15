import { apiClient } from './client'
import type { InterviewQuestionCategory, InterviewQuestionDifficulty } from './interviews'

export interface VoiceQuestion {
  questionId: string
  questionText: string
  category: InterviewQuestionCategory
  difficulty: InterviewQuestionDifficulty
  questionIndex: number
  totalQuestions: number
  audioBase64: string
}

export interface VoiceSessionState {
  sessionId: string
  mode: string
  status: string
  totalQuestions: number
  answeredCount: number
  overallScore: number | null
  currentQuestion: VoiceQuestion | null
}

export interface VoiceAnswerScore {
  relevance: number
  clarity: number
  depth: number
  correctness: number
  authenticity: number
  total: number
  comment: string
}

export interface VoiceAnswerResult {
  score: VoiceAnswerScore
  answerText: string
  feedbackAudioBase64: string
  isComplete: boolean
  nextQuestion: VoiceQuestion | null
}

export async function startVoiceInterview(sessionId: string): Promise<VoiceQuestion> {
  const { data } = await apiClient.post<VoiceQuestion>(`/interviews/${sessionId}/voice/start`)
  return data
}

export async function getVoiceInterviewState(sessionId: string): Promise<VoiceSessionState> {
  const { data } = await apiClient.get<VoiceSessionState>(`/interviews/${sessionId}/voice`)
  return data
}

export async function submitVoiceAnswer(
  sessionId: string,
  params: {
    questionId: string
    audioBlob: Blob | null
    responseLatencyMs: number
    tabBlurCount: number
    tabBlurTotalMs: number
  },
): Promise<VoiceAnswerResult> {
  const form = new FormData()
  form.append('questionId', params.questionId)
  form.append('responseLatencyMs', String(Math.max(0, Math.round(params.responseLatencyMs))))
  form.append('tabBlurCount', String(Math.max(0, Math.round(params.tabBlurCount))))
  form.append('tabBlurTotalMs', String(Math.max(0, Math.round(params.tabBlurTotalMs))))
  if (params.audioBlob) {
    form.append('audio', params.audioBlob, 'answer.webm')
  }

  const { data } = await apiClient.post<VoiceAnswerResult>(
    `/interviews/${sessionId}/voice/answer`,
    form,
  )
  return data
}

export async function endVoiceInterview(sessionId: string): Promise<void> {
  await apiClient.post(`/interviews/${sessionId}/voice/end`)
}

/** Chuyển base64 (không kèm data: prefix) trả về từ BE thành URL phát được cho thẻ <audio> */
export function audioBase64ToUrl(base64: string): string {
  const byteChars = atob(base64)
  const bytes = new Uint8Array(byteChars.length)
  for (let i = 0; i < byteChars.length; i++) bytes[i] = byteChars.charCodeAt(i)
  const blob = new Blob([bytes], { type: 'audio/mpeg' })
  return URL.createObjectURL(blob)
}
