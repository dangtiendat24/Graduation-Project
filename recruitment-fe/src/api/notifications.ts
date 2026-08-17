import { apiClient } from './client'

export interface NotificationItem {
  id: string
  type: string
  title: string
  message: string
  link: string | null
  isRead: boolean
  createdAt: string
}

export interface NotificationsResponse {
  items: NotificationItem[]
  total: number
  unreadCount: number
}

export async function getNotifications(params?: {
  page?: number
  limit?: number
}): Promise<NotificationsResponse> {
  const { data } = await apiClient.get<NotificationsResponse>('/notifications', { params })
  return data
}

export async function getUnreadNotificationCount(): Promise<{ unreadCount: number }> {
  const { data } = await apiClient.get<{ unreadCount: number }>('/notifications/unread-count')
  return data
}

export async function markNotificationRead(id: string): Promise<void> {
  await apiClient.patch(`/notifications/${id}/read`)
}

export async function markAllNotificationsRead(): Promise<void> {
  await apiClient.patch('/notifications/read-all')
}
