import { apiClient } from './client'

export interface NotificationPreferences {
  newApplication: boolean
  scheduleConfirmed: boolean
  matchingComplete: boolean
}

export interface ScoringWeights {
  skills: number
  experience: number
  education: number
}

export interface SettingsData {
  fullName: string
  email: string
  phone: string | null
  avatarUrl: string | null
  role: 'recruiter' | 'candidate'
  hasPassword: boolean
  notificationPreferences: NotificationPreferences
  defaultScoringWeights: ScoringWeights | null
}

export interface UpdateAccountPayload {
  fullName?: string
  phone?: string
}

export interface ChangePasswordPayload {
  currentPassword: string
  newPassword: string
}

export async function getSettings(): Promise<SettingsData> {
  const { data } = await apiClient.get<SettingsData>('/settings')
  return data
}

export async function updateAccount(payload: UpdateAccountPayload): Promise<SettingsData> {
  const { data } = await apiClient.patch<SettingsData>('/settings/account', payload)
  return data
}

export async function changePassword(payload: ChangePasswordPayload): Promise<void> {
  await apiClient.post('/settings/change-password', payload)
}

export async function updateNotificationPreferences(
  payload: NotificationPreferences,
): Promise<SettingsData> {
  const { data } = await apiClient.patch<SettingsData>('/settings/notifications', payload)
  return data
}

export async function updateScoringWeights(weights: ScoringWeights | null): Promise<SettingsData> {
  const { data } = await apiClient.patch<SettingsData>('/settings/scoring-weights', { weights })
  return data
}

export async function uploadAvatar(file: File): Promise<SettingsData> {
  const form = new FormData()
  form.append('file', file)
  const { data } = await apiClient.post<SettingsData>('/settings/account/avatar', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return data
}

export async function removeAvatar(): Promise<SettingsData> {
  const { data } = await apiClient.delete<SettingsData>('/settings/account/avatar')
  return data
}
