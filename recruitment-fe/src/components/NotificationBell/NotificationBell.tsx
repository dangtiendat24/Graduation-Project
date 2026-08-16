import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  getNotifications,
  getUnreadNotificationCount,
  markAllNotificationsRead,
  markNotificationRead,
  type NotificationItem,
} from '../../api/notifications'
import './NotificationBell.css'

const UNREAD_COUNT_KEY = ['notifications-unread-count']
const LIST_KEY = ['notifications', 'list']

function formatRelativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime()
  const minutes = Math.floor(diffMs / 60000)
  if (minutes < 1) return 'Vừa xong'
  if (minutes < 60) return `${minutes} phút trước`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} giờ trước`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days} ngày trước`
  return new Date(iso).toLocaleDateString('vi-VN')
}

export default function NotificationBell() {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { data: unreadData } = useQuery({
    queryKey: UNREAD_COUNT_KEY,
    queryFn: getUnreadNotificationCount,
    refetchInterval: 20000,
  })
  const unreadCount = unreadData?.unreadCount ?? 0

  const { data: listData, isLoading } = useQuery({
    queryKey: LIST_KEY,
    queryFn: () => getNotifications({ limit: 15 }),
    enabled: open,
  })
  const items = listData?.items ?? []

  const markReadMutation = useMutation({
    mutationFn: markNotificationRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: UNREAD_COUNT_KEY })
      queryClient.invalidateQueries({ queryKey: LIST_KEY })
    },
  })

  const markAllReadMutation = useMutation({
    mutationFn: markAllNotificationsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: UNREAD_COUNT_KEY })
      queryClient.invalidateQueries({ queryKey: LIST_KEY })
    },
  })

  useEffect(() => {
    if (!open) return
    function handleClickOutside(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  function handleItemClick(item: NotificationItem) {
    if (!item.isRead) markReadMutation.mutate(item.id)
    setOpen(false)
    if (item.link) navigate(item.link)
  }

  return (
    <div className="nb-root" ref={rootRef}>
      <button
        type="button"
        className="nb-bell-btn"
        onClick={() => setOpen((v) => !v)}
        aria-label="Thông báo"
      >
        <i className="ti ti-bell" />
        {unreadCount > 0 && (
          <span className="nb-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>
        )}
      </button>

      {open && (
        <div className="nb-panel">
          <div className="nb-panel-header">
            <span>Thông báo</span>
            {unreadCount > 0 && (
              <button
                type="button"
                className="nb-mark-all-btn"
                onClick={() => markAllReadMutation.mutate()}
              >
                Đánh dấu tất cả đã đọc
              </button>
            )}
          </div>

          <div className="nb-panel-list">
            {isLoading && <div className="nb-empty">Đang tải...</div>}
            {!isLoading && items.length === 0 && (
              <div className="nb-empty">Không có thông báo nào</div>
            )}
            {items.map((item) => (
              <div
                key={item.id}
                className={`nb-item${item.isRead ? '' : ' nb-item-unread'}`}
                onClick={() => handleItemClick(item)}
              >
                {!item.isRead && <span className="nb-item-dot" />}
                <div className="nb-item-body">
                  <div className="nb-item-title">{item.title}</div>
                  <div className="nb-item-message">{item.message}</div>
                  <div className="nb-item-time">{formatRelativeTime(item.createdAt)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
