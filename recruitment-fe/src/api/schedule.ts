import { apiClient } from './client'
import type { ApplicationStatus } from './candidates'

export interface TimeSlot {
  start: string
  end: string
}

export type ScheduleStatus = 'pending' | 'confirmed' | 'cancelled'

export interface ScheduleDetail {
  id: string
  applicationId: string
  status: ScheduleStatus
  proposedSlots: TimeSlot[] | null
  confirmedStartTime: string | null
  confirmedEndTime: string | null
  meetLink: string | null
}

export interface GoogleCalendarStatus {
  connected: boolean
  connectedAt: string | null
}

export interface RecruiterScheduleListItem {
  jobId: string
  jobTitle: string
  applicationId: string
  applicationStatus: ApplicationStatus
  candidateId: string
  candidateName: string
  candidateEmail: string
  schedule: {
    status: ScheduleStatus
    proposedSlots: TimeSlot[] | null
    confirmedStartTime: string | null
    confirmedEndTime: string | null
    meetLink: string | null
  } | null
}

export async function getGoogleCalendarStatus(): Promise<GoogleCalendarStatus> {
  const { data } = await apiClient.get<GoogleCalendarStatus>('/google-calendar/status')
  return data
}

export async function getGoogleCalendarConnectUrl(returnTo?: string): Promise<string> {
  const { data } = await apiClient.get<{ url: string }>('/auth/google/calendar', {
    params: returnTo ? { returnTo } : undefined,
  })
  return data.url
}

export async function suggestInterviewSlots(params: {
  startDate: string
  endDate: string
  durationMinutes?: number
}): Promise<TimeSlot[]> {
  const { data } = await apiClient.get<TimeSlot[]>('/google-calendar/suggest-slots', { params })
  return data
}

export async function proposeInterviewSlots(
  jobId: string,
  applicationId: string,
  slots: TimeSlot[],
): Promise<ScheduleDetail> {
  const { data } = await apiClient.post<ScheduleDetail>(
    `/jobs/${jobId}/applications/${applicationId}/schedule`,
    { slots },
  )
  return data
}

export async function getApplicationSchedule(
  jobId: string,
  applicationId: string,
): Promise<ScheduleDetail | null> {
  const { data } = await apiClient.get<ScheduleDetail | null>(
    `/jobs/${jobId}/applications/${applicationId}/schedule`,
  )
  return data
}

export async function getRecruiterSchedules(): Promise<RecruiterScheduleListItem[]> {
  const { data } = await apiClient.get<RecruiterScheduleListItem[]>('/recruiter/schedules')
  return data
}
