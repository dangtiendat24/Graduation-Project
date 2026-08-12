import { useMemo, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import DashboardLayout from '../../layouts/DashboardLayout/DashboardLayout'
import { getJob } from '../../api/jobs'
import { getRecruiterSchedules } from '../../api/schedule'
import type { RecruiterScheduleListItem } from '../../api/schedule'
import { updateApplicationStatus } from '../../api/rankings'
import ScheduleBox from './ScheduleBox'
import InterviewOutcomeModal from './InterviewOutcomeModal'
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

// "Đã phỏng vấn" = đã qua giờ hẹn (confirmedEndTime/StartTime ở quá khứ), hoặc hiếm hơn đã ở
// 'completed'. Recruiter chỉ đánh dấu kết quả (Đã tuyển/Từ chối) cho nhóm này — buổi phỏng vấn
// thực tế diễn ra ngoài hệ thống nên không có cách tự động biết, chỉ suy ra từ mốc giờ đã đặt.
function isInterviewDone(item: RecruiterScheduleListItem): boolean {
  if (item.applicationStatus === 'completed') return true
  if (item.applicationStatus !== 'scheduled') return false
  const end = item.schedule?.confirmedEndTime ?? item.schedule?.confirmedStartTime
  if (!end) return false
  return new Date(end).getTime() < Date.now()
}

type InterviewTab = 'upcoming' | 'done'

interface OutcomeTarget {
  item: RecruiterScheduleListItem
  action: 'hired' | 'rejected' | 'completed'
}

export default function RecruiterInterviewJobDetailPage() {
  const { jobId } = useParams<{ jobId: string }>()
  const location = useLocation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [manualSelection, setManualSelection] = useState<RecruiterScheduleListItem | null>(null)
  const [autoOpenDismissed, setAutoOpenDismissed] = useState(false)
  const [outcomeTarget, setOutcomeTarget] = useState<OutcomeTarget | null>(null)
  const [tab, setTab] = useState<InterviewTab>('upcoming')

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
  const upcomingItems = useMemo(() => items.filter((i) => !isInterviewDone(i)), [items])
  const doneItems = useMemo(() => items.filter((i) => isInterviewDone(i)), [items])
  const visibleItems = tab === 'upcoming' ? upcomingItems : doneItems

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

  const outcomeMutation = useMutation({
    mutationFn: ({ item, action }: OutcomeTarget) =>
      updateApplicationStatus(item.jobId, item.applicationId, action),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recruiter-schedules'] })
      setOutcomeTarget(null)
    },
  })

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

        {!isLoading && !isError && items.length > 0 && (
          <div className="ri-tab-bar">
            <button
              className={`ri-tab${tab === 'upcoming' ? ' active' : ''}`}
              onClick={() => setTab('upcoming')}
            >
              Sắp phỏng vấn <span className="ri-tab-count">{upcomingItems.length}</span>
            </button>
            <button
              className={`ri-tab${tab === 'done' ? ' active' : ''}`}
              onClick={() => setTab('done')}
            >
              Đã phỏng vấn <span className="ri-tab-count">{doneItems.length}</span>
            </button>
          </div>
        )}

        {!isLoading && !isError && items.length > 0 && visibleItems.length === 0 && (
          <div className="ri-empty">
            <i className="ti ti-calendar-off" />
            <p>
              {tab === 'upcoming'
                ? 'Không có ứng viên nào đang chờ tới lịch phỏng vấn.'
                : 'Chưa có ứng viên nào đã qua giờ phỏng vấn.'}
            </p>
          </div>
        )}

        {visibleItems.length > 0 && (
          <div className="ri-candidate-list">
            {visibleItems.map((item) => {
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
                    {item.schedule?.status === 'confirmed' && item.schedule.meetLink && (
                      <a
                        href={item.schedule.meetLink}
                        target="_blank"
                        rel="noreferrer"
                        className="ri-btn-meet"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <i className="ti ti-video" /> Tham gia Google Meet
                      </a>
                    )}
                    {item.schedule?.status === 'pending' && (
                      <span className="ri-schedule-time">
                        Đã gửi {item.schedule.proposedSlots?.length ?? 0} khung giờ
                      </span>
                    )}
                  </div>

                  <div className="ri-candidate-actions">
                    {!isInterviewDone(item) && (
                      <button className="ri-btn-schedule" onClick={() => setManualSelection(item)}>
                        <i className="ti ti-calendar-plus" />
                        {item.schedule ? 'Xem / Sửa lịch' : 'Lên lịch'}
                      </button>
                    )}
                    {!isInterviewDone(item) && item.applicationStatus === 'scheduled' && (
                      <button
                        className="ri-btn-mark-done"
                        title="Dùng khi buổi phỏng vấn đã diễn ra sớm hơn giờ hẹn trong lịch"
                        onClick={() => setOutcomeTarget({ item, action: 'completed' })}
                      >
                        <i className="ti ti-checkbox" /> Đánh dấu đã phỏng vấn
                      </button>
                    )}
                    <div className="ri-outcome-buttons">
                      {isInterviewDone(item) && (
                        <button
                          className="ri-btn-hire"
                          onClick={() => setOutcomeTarget({ item, action: 'hired' })}
                        >
                          <i className="ti ti-user-check" /> Đã tuyển
                        </button>
                      )}
                      <button
                        className="ri-btn-reject"
                        onClick={() => setOutcomeTarget({ item, action: 'rejected' })}
                      >
                        <i className="ti ti-user-x" /> Từ chối
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {scheduleFor && (
        <ScheduleBox item={scheduleFor} onClose={closeBox} onSent={handleSent} />
      )}

      {outcomeTarget && (
        <InterviewOutcomeModal
          candidateName={outcomeTarget.item.candidateName}
          jobTitle={outcomeTarget.item.jobTitle}
          action={outcomeTarget.action}
          isPending={outcomeMutation.isPending}
          onConfirm={() => outcomeMutation.mutate(outcomeTarget)}
          onCancel={() => setOutcomeTarget(null)}
        />
      )}
    </DashboardLayout>
  )
}
