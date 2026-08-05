import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import CandidateLayout from '../../layouts/CandidateLayout/CandidateLayout'
import { getMyApplications, confirmScheduleSlot } from '../../api/candidateApplications'
import type { MyApplicationListItem, ProposedSlot } from '../../api/candidateApplications'
import type { ApplicationStatus } from '../../api/applications'
import {
  Building2,
  MapPin,
  ChevronDown,
  UserCheck,
  Calendar,
  CalendarCheck,
  CheckCircle2,
  Video,
  Clock,
  type LucideIcon,
} from 'lucide-react'
import './CandidateSchedulePage.css'

const INTERVIEW_RELATED_STATUSES: ApplicationStatus[] = [
  'interviewed',
  'schedule_sent',
  'scheduled',
  'completed',
]

const STATUS_CONFIG: Record<string, { label: string; clsPrefix: string; icon: LucideIcon }> = {
  interviewed: { label: 'Chờ nhà tuyển dụng gửi lịch', clsPrefix: 'cs-st-interviewed', icon: UserCheck },
  schedule_sent: { label: 'Chờ bạn chọn khung giờ', clsPrefix: 'cs-st-schedule_sent', icon: Calendar },
  scheduled: { label: 'Đã xác nhận lịch', clsPrefix: 'cs-st-scheduled', icon: CalendarCheck },
  completed: { label: 'Đã phỏng vấn xong', clsPrefix: 'cs-st-completed', icon: CheckCircle2 },
}

function getInitials(name: string): string {
  return name.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase()
}

function slotKey(slot: ProposedSlot): string {
  return `${slot.start}|${slot.end}`
}

function formatSlotLabel(slot: ProposedSlot): string {
  const start = new Date(slot.start)
  const end = new Date(slot.end)
  const dateFmt = new Intl.DateTimeFormat('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit' })
  const timeFmt = new Intl.DateTimeFormat('vi-VN', { hour: '2-digit', minute: '2-digit' })
  return `${timeFmt.format(start)} - ${timeFmt.format(end)}, ${dateFmt.format(start)}`
}

function formatConfirmedLabel(startISO: string, endISO: string | null): string {
  const start = new Date(startISO)
  const dateFmt = new Intl.DateTimeFormat('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' })
  const timeFmt = new Intl.DateTimeFormat('vi-VN', { hour: '2-digit', minute: '2-digit' })
  const timeLabel = endISO ? `${timeFmt.format(start)} - ${timeFmt.format(new Date(endISO))}` : timeFmt.format(start)
  return `${timeLabel}, ${dateFmt.format(start)}`
}

interface ItemProps {
  app: MyApplicationListItem
  expanded: boolean
  onToggle: () => void
}

function ScheduleCard({ app, expanded, onToggle }: ItemProps) {
  const queryClient = useQueryClient()
  const [selected, setSelected] = useState<ProposedSlot | null>(null)
  const [confirmError, setConfirmError] = useState<string | null>(null)

  const companyName = app.job.company?.name ?? 'N/A'
  const logo = app.job.company?.logoUrl
  const config = STATUS_CONFIG[app.status]

  const confirmMutation = useMutation({
    mutationFn: (slot: ProposedSlot) => confirmScheduleSlot(app.applicationId, slot),
    onMutate: () => setConfirmError(null),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['candidate-applications'] })
    },
    onError: () => {
      setConfirmError('Xác nhận khung giờ thất bại. Vui lòng thử lại.')
    },
  })

  if (!config) return null
  const StatusIcon = config.icon

  return (
    <div className={`cs-card${expanded ? ' cs-card--expanded' : ''}`}>
      <button className="cs-card-header" onClick={onToggle}>
        <div className="cs-logo">
          {logo ? <img src={logo} alt={companyName} /> : getInitials(companyName)}
        </div>
        <div className="cs-job-info">
          <h3 className="cs-job-title">{app.job.title}</h3>
          <div className="cs-job-meta">
            <span><Building2 size={14} /> {companyName}</span>
            {app.job.location && <span><MapPin size={14} /> {app.job.location}</span>}
          </div>
        </div>
        <div className={`cs-badge ${config.clsPrefix}-bg`}>
          <StatusIcon size={15} strokeWidth={2.5} />
          {config.label}
        </div>
        <ChevronDown size={20} className={`cs-chevron${expanded ? ' cs-chevron--open' : ''}`} />
      </button>

      {expanded && (
        <div className="cs-card-body">
          {app.status === 'interviewed' && (
            <p className="cs-hint">
              Bạn đã được mời phỏng vấn cho vị trí này. Nhà tuyển dụng sẽ sớm gửi khung giờ phỏng vấn cụ thể.
            </p>
          )}

          {app.status === 'schedule_sent' && app.schedule?.proposedSlots && (
            <>
              <p className="cs-hint">
                Nhà tuyển dụng đã đề xuất {app.schedule.proposedSlots.length} khung giờ dưới đây. Chọn 1 khung giờ phù hợp với bạn — hệ thống sẽ tự tạo cuộc gọi Google Meet và gửi email xác nhận.
              </p>
              <div className="cs-slot-list">
                {app.schedule.proposedSlots.map((slot) => {
                  const key = slotKey(slot)
                  const isSelected = selected ? slotKey(selected) === key : false
                  return (
                    <label key={key} className={`cs-slot-item${isSelected ? ' cs-slot-item--selected' : ''}`}>
                      <input
                        type="radio"
                        name={`slot-${app.applicationId}`}
                        checked={isSelected}
                        onChange={() => setSelected(slot)}
                      />
                      <Clock size={15} />
                      {formatSlotLabel(slot)}
                    </label>
                  )
                })}
              </div>
              {confirmError && <p className="cs-error">{confirmError}</p>}
              <button
                className="cs-btn-primary"
                disabled={!selected || confirmMutation.isPending}
                onClick={() => selected && confirmMutation.mutate(selected)}
              >
                {confirmMutation.isPending ? 'Đang xác nhận…' : 'Xác nhận khung giờ này'}
              </button>
            </>
          )}

          {(app.status === 'scheduled' || app.status === 'completed') && app.schedule?.confirmedStartTime && (
            <div className="cs-confirmed">
              <div className="cs-confirmed-time">
                <Clock size={16} />
                {formatConfirmedLabel(app.schedule.confirmedStartTime, null)}
              </div>
              {app.schedule.meetLink && (
                <a href={app.schedule.meetLink} target="_blank" rel="noreferrer" className="cs-btn-meet">
                  <Video size={16} /> Tham gia Google Meet
                </a>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function CandidateSchedulePage() {
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const { data, isLoading, isError } = useQuery({
    queryKey: ['candidate-applications', 'list'],
    queryFn: () => getMyApplications({ limit: 100 }),
  })

  const items = useMemo(
    () => (data?.data ?? []).filter((a) => INTERVIEW_RELATED_STATUSES.includes(a.status)),
    [data],
  )

  const pendingCount = items.filter((a) => a.status === 'schedule_sent').length
  const confirmedCount = items.filter((a) => a.status === 'scheduled' || a.status === 'completed').length

  return (
    <CandidateLayout>
      <div className="cs-header">
        <h1 className="cs-title">Lịch phỏng vấn</h1>
        <p className="cs-sub">Xem các lời mời phỏng vấn và chọn khung giờ phù hợp với bạn.</p>
      </div>

      <div className="cs-stats">
        <div className="cs-stat-box">
          <div className="cs-stat-num">{items.length}</div>
          <div className="cs-stat-label">Tổng lời mời</div>
        </div>
        <div className="cs-stat-box cs-stat-box--amber">
          <div className="cs-stat-num">{pendingCount}</div>
          <div className="cs-stat-label">Chờ bạn chọn khung giờ</div>
        </div>
        <div className="cs-stat-box cs-stat-box--teal">
          <div className="cs-stat-num">{confirmedCount}</div>
          <div className="cs-stat-label">Đã xác nhận lịch</div>
        </div>
      </div>

      {isLoading && <div className="cs-empty">Đang tải…</div>}
      {isError && <div className="cs-empty cs-empty--error">Không tải được danh sách lịch phỏng vấn.</div>}
      {!isLoading && !isError && items.length === 0 && (
        <div className="cs-empty">
          <Calendar size={32} />
          <p>Bạn chưa có lời mời phỏng vấn nào.</p>
        </div>
      )}

      {items.length > 0 && (
        <div className="cs-list">
          {items.map((app) => (
            <ScheduleCard
              key={app.applicationId}
              app={app}
              expanded={expandedId === app.applicationId}
              onToggle={() => setExpandedId((cur) => (cur === app.applicationId ? null : app.applicationId))}
            />
          ))}
        </div>
      )}
    </CandidateLayout>
  )
}
