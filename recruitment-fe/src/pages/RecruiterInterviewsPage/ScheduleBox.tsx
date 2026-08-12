import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { isAxiosError } from 'axios'
import {
  getGoogleCalendarStatus,
  getGoogleCalendarConnectUrl,
  suggestInterviewSlots,
  proposeInterviewSlots,
} from '../../api/schedule'
import type { RecruiterScheduleListItem, TimeSlot } from '../../api/schedule'

interface Props {
  item: RecruiterScheduleListItem
  onClose: () => void
  onSent: () => void
}

const DURATION_OPTIONS = [30, 45, 60]
const MAX_SELECTABLE_SLOTS = 5

function slotKey(slot: TimeSlot): string {
  return `${slot.start}|${slot.end}`
}

function todayPlusDays(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

function formatSlotLabel(slot: TimeSlot): string {
  const start = new Date(slot.start)
  const end = new Date(slot.end)
  const dateFmt = new Intl.DateTimeFormat('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit' })
  const timeFmt = new Intl.DateTimeFormat('vi-VN', { hour: '2-digit', minute: '2-digit' })
  return `${timeFmt.format(start)} - ${timeFmt.format(end)}, ${dateFmt.format(start)}`
}

function getErrorMessage(err: unknown, fallback: string): string {
  if (isAxiosError(err)) {
    const data = err.response?.data as { message?: string } | undefined
    if (typeof data?.message === 'string') return data.message
  }
  return fallback
}

export default function ScheduleBox({ item, onClose, onSent }: Props) {
  const queryClient = useQueryClient()
  const [duration, setDuration] = useState(45)
  const [selectedDate, setSelectedDate] = useState('')
  const [slots, setSlots] = useState<TimeSlot[] | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const statusQuery = useQuery({
    queryKey: ['google-calendar-status'],
    queryFn: getGoogleCalendarStatus,
  })

  const connectMutation = useMutation({
    // Truyền đúng trang đang đứng (vd trang lên lịch của job này) để sau khi cấp quyền Google
    // xong, callback đưa recruiter quay lại đây thay vì luôn về trang Cài đặt.
    mutationFn: () => getGoogleCalendarConnectUrl(window.location.pathname),
    onSuccess: (url) => {
      window.location.href = url
    },
  })

  const checkMutation = useMutation({
    mutationFn: () =>
      suggestInterviewSlots({
        startDate: selectedDate,
        endDate: selectedDate,
        durationMinutes: duration,
      }),
    onSuccess: (data) => {
      setSlots(data)
      setSelected(new Set())
    },
    // Lỗi xác thực Google (refresh_token bị thu hồi/hết hạn) khiến BE tự xoá credential —
    // refetch lại status để box chuyển về panel "Kết nối Google Calendar" thay vì kẹt ở
    // panel đã kết nối chỉ có dòng chữ lỗi mà không có cách nào bấm kết nối lại.
    onError: () => {
      queryClient.invalidateQueries({ queryKey: ['google-calendar-status'] })
    },
  })

  function handleDateChange(value: string) {
    setSelectedDate(value)
    setSlots(null)
    setSelected(new Set())
  }

  const sendMutation = useMutation({
    mutationFn: (chosen: TimeSlot[]) => proposeInterviewSlots(item.jobId, item.applicationId, chosen),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recruiter-schedules'] })
      onSent()
    },
  })

  function toggleSlot(slot: TimeSlot) {
    setSelected((prev) => {
      const next = new Set(prev)
      const key = slotKey(slot)
      if (next.has(key)) {
        next.delete(key)
      } else if (next.size < MAX_SELECTABLE_SLOTS) {
        next.add(key)
      }
      return next
    })
  }

  function handleSend() {
    if (!slots) return
    const chosen = slots.filter((s) => selected.has(slotKey(s)))
    if (chosen.length === 0) return
    sendMutation.mutate(chosen)
  }

  const connected = statusQuery.data?.connected ?? false
  const alreadyProposed = item.schedule?.proposedSlots ?? null

  return (
    <div className="ri-overlay" onClick={onClose}>
      <div className="ri-box" onClick={(e) => e.stopPropagation()}>
        <div className="ri-box-header">
          <div>
            <h2 className="ri-box-title">Đặt lịch phỏng vấn</h2>
            <p className="ri-box-sub">
              <strong>{item.candidateName}</strong> — {item.jobTitle}
            </p>
          </div>
          <button className="ri-box-close" onClick={onClose} aria-label="Đóng">
            <i className="ti ti-x" />
          </button>
        </div>

        <div className="ri-box-body">
          {statusQuery.isLoading && <p className="ri-hint">Đang kiểm tra kết nối Google Calendar…</p>}

          {statusQuery.isSuccess && !connected && (
            <div className="ri-connect-panel">
              <i className="ti ti-brand-google" />
              <p>Bạn chưa kết nối Google Calendar — cần kết nối để kiểm tra lịch trống và gửi khung giờ phỏng vấn.</p>
              <button
                className="ri-btn-primary"
                onClick={() => connectMutation.mutate()}
                disabled={connectMutation.isPending}
              >
                {connectMutation.isPending ? 'Đang chuyển hướng…' : 'Kết nối Google Calendar'}
              </button>
              {connectMutation.isError && (
                <p className="ri-error">Không lấy được liên kết kết nối. Vui lòng thử lại.</p>
              )}
            </div>
          )}

          {connected && (
            <>
              {alreadyProposed && item.schedule?.status === 'pending' && (
                <div className="ri-note">
                  Đã gửi {alreadyProposed.length} khung giờ cho ứng viên — đang chờ xác nhận. Gửi lại sẽ thay thế đề xuất cũ.
                </div>
              )}
              {item.schedule?.status === 'confirmed' && (
                <div className="ri-note ri-note--confirmed">
                  Ứng viên đã xác nhận lịch. Gửi lại sẽ tạo đề xuất mới và cần ứng viên xác nhận lại.
                </div>
              )}

              <div className="ri-check-row">
                <label className="ri-duration-label">
                  Ngày phỏng vấn
                  <input
                    type="date"
                    className="ri-date-input"
                    min={todayPlusDays(1)}
                    value={selectedDate}
                    onChange={(e) => handleDateChange(e.target.value)}
                  />
                </label>
                <label className="ri-duration-label">
                  Thời lượng
                  <select value={duration} onChange={(e) => setDuration(Number(e.target.value))}>
                    {DURATION_OPTIONS.map((d) => (
                      <option key={d} value={d}>
                        {d} phút
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  className="ri-btn-secondary"
                  onClick={() => checkMutation.mutate()}
                  disabled={!selectedDate || checkMutation.isPending}
                >
                  <i className="ti ti-calendar-search" />
                  {checkMutation.isPending ? 'Đang kiểm tra…' : 'Kiểm tra lịch trống'}
                </button>
              </div>

              {!selectedDate && (
                <p className="ri-hint">Chọn 1 ngày cụ thể để kiểm tra lịch trống của nhà tuyển dụng trong ngày đó.</p>
              )}

              {checkMutation.isError && (
                <p className="ri-error">
                  {getErrorMessage(checkMutation.error, 'Không kiểm tra được lịch trống. Vui lòng thử lại.')}
                </p>
              )}

              {slots && slots.length === 0 && !checkMutation.isPending && (
                <p className="ri-hint">Không tìm thấy khung giờ trống phù hợp trong ngày đã chọn.</p>
              )}

              {slots && slots.length > 0 && (
                <div className="ri-slot-list">
                  {slots.map((slot) => {
                    const key = slotKey(slot)
                    const isSelected = selected.has(key)
                    return (
                      <label key={key} className={`ri-slot-item${isSelected ? ' ri-slot-item--selected' : ''}`}>
                        <input type="checkbox" checked={isSelected} onChange={() => toggleSlot(slot)} />
                        {formatSlotLabel(slot)}
                      </label>
                    )
                  })}
                </div>
              )}

              {sendMutation.isError && (
                <p className="ri-error">
                  {getErrorMessage(sendMutation.error, 'Không gửi được khung giờ. Vui lòng thử lại.')}
                </p>
              )}
            </>
          )}
        </div>

        {connected && (
          <div className="ri-box-actions">
            <button className="ri-btn-ghost" onClick={onClose} disabled={sendMutation.isPending}>
              Huỷ
            </button>
            <button
              className="ri-btn-primary"
              onClick={handleSend}
              disabled={selected.size === 0 || sendMutation.isPending}
            >
              {sendMutation.isPending
                ? 'Đang gửi…'
                : `Gửi${selected.size > 0 ? ` ${selected.size}` : ''} khung giờ cho ứng viên`}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
