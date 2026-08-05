import { useMemo, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import DashboardLayout from '../../layouts/DashboardLayout/DashboardLayout'
import { getJob } from '../../api/jobs'
import { getRecruiterSchedules } from '../../api/schedule'
import type { RecruiterScheduleListItem } from '../../api/schedule'
import ScheduleBox from './ScheduleBox'
import './RecruiterInterviewJobDetailPage.css'

interface NavState {
  inviteCandidate?: {
    applicationId: string
    candidateName: string
    candidateEmail: string
  }
  /** Có mặt khi điều hướng tới đây từ trang "Lịch phỏng vấn tổng quan" (xem theo tuần) — dùng để
   * breadcrumb quay lại đúng tuần đang xem thay vì luôn về trang danh sách vị trí. */
  fromCalendarWeekStart?: string
}

const STATUS_BADGE: Record<string, { className: string; label: string }> = {
  interviewed: { className: 'badge-interviewed', label: 'Chưa gửi khung giờ' },
  schedule_sent: { className: 'badge-schedule', label: 'Chờ ứng viên xác nhận' },
  scheduled: { className: 'badge-scheduled', label: 'Đã xác nhận lịch' },
  completed: { className: 'badge-completed', label: 'Đã hoàn thành phỏng vấn' },
}

function formatVNDateTime(startISO: string, endISO: string | null): string {
  const start = new Date(startISO)
  const dateFmt = new Intl.DateTimeFormat('vi-VN', { weekday: 'short', day: '2-digit', month: '2-digit' })
  const timeFmt = new Intl.DateTimeFormat('vi-VN', { hour: '2-digit', minute: '2-digit' })
  const timeLabel = endISO ? `${timeFmt.format(start)} - ${timeFmt.format(new Date(endISO))}` : timeFmt.format(start)
  return `${timeLabel}, ${dateFmt.format(start)}`
}

function getInitial(name: string): string {
  return name.trim().charAt(0).toUpperCase() || '?'
}

export default function RecruiterInterviewJobDetailPage() {
  const { jobId } = useParams<{ jobId: string }>()
  const location = useLocation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [manualSelection, setManualSelection] = useState<RecruiterScheduleListItem | null>(null)
  const [autoOpenDismissed, setAutoOpenDismissed] = useState(false)

  const { data: job } = useQuery({
    queryKey: ['job', jobId],
    queryFn: () => getJob(jobId!),
    enabled: !!jobId,
  })

  const { data, isLoading, isError } = useQuery({
    queryKey: ['recruiter-schedules'],
    queryFn: getRecruiterSchedules,
  })

  const items = useMemo(() => (data ?? []).filter((i) => i.jobId === jobId), [data, jobId])

  // Tự mở box lên lịch cho ứng viên vừa được mời phỏng vấn (điều hướng từ trang Xếp hạng ứng viên) —
  // dẫn xuất trực tiếp từ query data + location.state, không dùng effect/setState để tránh cascading render.
  // Ứng viên vừa mời vẫn đang ở status 'matched' (chưa có trong /recruiter/schedules, API đó chỉ trả
  // từ 'interviewed' trở đi) nên cần dựng tạm 1 item từ dữ liệu điều hướng để mở box.
  const navState = location.state as NavState | null
  const inviteCandidate = navState?.inviteCandidate
  const existingItem = inviteCandidate
    ? items.find((i) => i.applicationId === inviteCandidate.applicationId)
    : undefined
  const syntheticInviteItem: RecruiterScheduleListItem | null =
    inviteCandidate && !existingItem
      ? {
          jobId: jobId!,
          jobTitle: job?.title ?? '',
          applicationId: inviteCandidate.applicationId,
          applicationStatus: 'matched',
          candidateId: '',
          candidateName: inviteCandidate.candidateName,
          candidateEmail: inviteCandidate.candidateEmail,
          schedule: null,
        }
      : null
  const autoOpenItem =
    !autoOpenDismissed && inviteCandidate ? (existingItem ?? syntheticInviteItem) : null
  const scheduleFor = manualSelection ?? autoOpenItem

  function closeBox() {
    setManualSelection(null)
    setAutoOpenDismissed(true)
  }

  function goBackToList() {
    if (navState?.fromCalendarWeekStart) {
      navigate('/recruiter/interviews/calendar', { state: { weekStart: navState.fromCalendarWeekStart } })
    } else {
      navigate('/recruiter/interviews')
    }
  }

  function handleSent() {
    queryClient.invalidateQueries({ queryKey: ['recruiter-schedules'] })
    closeBox()
  }

  return (
    <DashboardLayout>
      <div className="ri-page">
        <div className="ri-breadcrumb">
          <span className="ri-bc-link" onClick={goBackToList}>Lịch phỏng vấn</span>
          <i className="ti ti-chevron-right" />
          <span className="ri-bc-current">{job?.title ?? '…'}</span>
        </div>

        <div className="ri-header">
          <h1 className="ri-title">{job?.title ?? 'Lịch phỏng vấn'}</h1>
          <p className="ri-sub">
            Quản lý khung giờ phỏng vấn đã gửi và đã xác nhận cho từng ứng viên của vị trí này.
          </p>
        </div>

        {isLoading && <div className="ri-empty">Đang tải…</div>}
        {isError && <div className="ri-empty ri-empty--error">Không tải được danh sách lịch phỏng vấn.</div>}
        {!isLoading && !isError && items.length === 0 && (
          <div className="ri-empty">
            <i className="ti ti-calendar-off" />
            <p>Chưa có ứng viên nào được mời phỏng vấn cho vị trí này.</p>
          </div>
        )}

        {items.length > 0 && (
          <div className="ri-candidate-list">
            {items.map((item) => {
              const badge = STATUS_BADGE[item.applicationStatus]
              return (
                <div key={item.applicationId} className="ri-candidate-row">
                  <div className="ri-candidate-info">
                    <div className="ri-candidate-avatar">{getInitial(item.candidateName)}</div>
                    <div>
                      <div className="ri-candidate-name">{item.candidateName}</div>
                      <div className="ri-candidate-email">{item.candidateEmail}</div>
                    </div>
                  </div>

                  <div className="ri-candidate-status">
                    {badge && <span className={`badge ${badge.className}`}>{badge.label}</span>}
                    {item.schedule?.status === 'confirmed' && item.schedule.confirmedStartTime && (
                      <span className="ri-schedule-time">
                        <i className="ti ti-clock" />
                        {formatVNDateTime(item.schedule.confirmedStartTime, item.schedule.confirmedEndTime)}
                      </span>
                    )}
                    {item.schedule?.status === 'pending' && (
                      <span className="ri-schedule-time">
                        Đã gửi {item.schedule.proposedSlots?.length ?? 0} khung giờ
                      </span>
                    )}
                  </div>

                  <button className="ri-btn-schedule" onClick={() => setManualSelection(item)}>
                    <i className="ti ti-calendar-plus" />
                    {item.schedule ? 'Xem / Sửa lịch' : 'Lên lịch'}
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {scheduleFor && (
        <ScheduleBox item={scheduleFor} onClose={closeBox} onSent={handleSent} />
      )}
    </DashboardLayout>
  )
}
