import { useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import DashboardLayout from '../../layouts/DashboardLayout/DashboardLayout'
import { getRecruiterSchedules } from '../../api/schedule'
import './RecruiterScheduleCalendarPage.css'

interface CalendarNavState {
  weekStart?: string
}

const HOUR_START = 7
const HOUR_END = 20
const ROW_HEIGHT = 56
const VN_OFFSET_MINUTES = 7 * 60
const DAY_LABELS = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ nhật']

interface VNParts {
  year: number
  month: number
  date: number
  hours: number
  minutes: number
  dateKey: string
}

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

/** Quy đổi 1 thời điểm UTC sang giờ địa phương VN (UTC+7, không có DST) mà không phụ thuộc
 * timezone database của môi trường chạy — dùng chung để định vị sự kiện trên lưới lịch. */
function toVNParts(isoOrDate: string | Date): VNParts {
  const utcMs = typeof isoOrDate === 'string' ? new Date(isoOrDate).getTime() : isoOrDate.getTime()
  const shifted = new Date(utcMs + VN_OFFSET_MINUTES * 60000)
  const year = shifted.getUTCFullYear()
  const month = shifted.getUTCMonth()
  const date = shifted.getUTCDate()
  return {
    year,
    month,
    date,
    hours: shifted.getUTCHours(),
    minutes: shifted.getUTCMinutes(),
    dateKey: `${year}-${pad(month + 1)}-${pad(date)}`,
  }
}

/** Tạo lại 1 Date "mốc UTC giả" ứng với 00:00 giờ VN của ngày (year,month,date) — chỉ dùng để
 * tính toán thứ tự/khoảng cách ngày, không dùng để hiển thị trực tiếp. */
function vnMidnightUTC(year: number, month: number, date: number): Date {
  return new Date(Date.UTC(year, month, date, 0, 0, 0) - VN_OFFSET_MINUTES * 60000)
}

/** Thứ (0=CN..6=T7) của 1 ngày lịch — thuần phép tính lịch, không phụ thuộc timezone. */
function weekdayOfCalendarDate(year: number, month: number, date: number): number {
  return new Date(Date.UTC(year, month, date)).getUTCDay()
}

function startOfWeekVN(reference: VNParts): Date {
  const weekday = weekdayOfCalendarDate(reference.year, reference.month, reference.date)
  const mondayOffset = weekday === 0 ? -6 : 1 - weekday
  const monday = new Date(Date.UTC(reference.year, reference.month, reference.date + mondayOffset))
  return vnMidnightUTC(monday.getUTCFullYear(), monday.getUTCMonth(), monday.getUTCDate())
}

function addDays(base: Date, days: number): Date {
  const parts = toVNParts(base)
  const target = new Date(Date.UTC(parts.year, parts.month, parts.date + days))
  return vnMidnightUTC(target.getUTCFullYear(), target.getUTCMonth(), target.getUTCDate())
}

function formatDayLabel(day: Date): string {
  const p = toVNParts(day)
  return `${pad(p.date)}/${pad(p.month + 1)}`
}

function formatWeekRange(weekStart: Date, weekEnd: Date): string {
  const s = toVNParts(weekStart)
  const e = toVNParts(weekEnd)
  if (s.year !== e.year) {
    return `${pad(s.date)}/${pad(s.month + 1)}/${s.year} — ${pad(e.date)}/${pad(e.month + 1)}/${e.year}`
  }
  return `${pad(s.date)}/${pad(s.month + 1)} — ${pad(e.date)}/${pad(e.month + 1)}/${e.year}`
}

function formatTimeLabel(p: VNParts): string {
  return `${pad(p.hours)}:${pad(p.minutes)}`
}

interface CalendarEvent {
  key: string
  applicationId: string
  jobId: string
  jobTitle: string
  candidateName: string
  start: VNParts
  end: VNParts
  durationMinutes: number
  kind: 'confirmed' | 'pending'
  meetLink: string | null
}

export default function RecruiterScheduleCalendarPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [weekStart, setWeekStart] = useState<Date>(() => {
    const restoreWeekStart = (location.state as CalendarNavState | null)?.weekStart
    if (restoreWeekStart) {
      const [y, m, d] = restoreWeekStart.split('-').map(Number)
      return vnMidnightUTC(y, m - 1, d)
    }
    return startOfWeekVN(toVNParts(new Date()))
  })

  const { data, isLoading, isError } = useQuery({
    queryKey: ['recruiter-schedules'],
    queryFn: getRecruiterSchedules,
  })

  const todayKey = toVNParts(new Date()).dateKey

  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart])
  const weekDayKeys = useMemo(() => weekDays.map((d) => toVNParts(d).dateKey), [weekDays])
  const weekEnd = weekDays[6]

  const allEvents = useMemo<CalendarEvent[]>(() => {
    const events: CalendarEvent[] = []
    ;(data ?? []).forEach((item) => {
      if (!item.schedule) return
      if (item.schedule.status === 'confirmed' && item.schedule.confirmedStartTime && item.schedule.confirmedEndTime) {
        const start = toVNParts(item.schedule.confirmedStartTime)
        const end = toVNParts(item.schedule.confirmedEndTime)
        events.push({
          key: `confirmed-${item.applicationId}`,
          applicationId: item.applicationId,
          jobId: item.jobId,
          jobTitle: item.jobTitle,
          candidateName: item.candidateName,
          start,
          end,
          durationMinutes: Math.round(
            (new Date(item.schedule.confirmedEndTime).getTime() - new Date(item.schedule.confirmedStartTime).getTime()) / 60000,
          ),
          kind: 'confirmed',
          meetLink: item.schedule.meetLink,
        })
      } else if (item.schedule.status === 'pending' && item.schedule.proposedSlots) {
        item.schedule.proposedSlots.forEach((slot, idx) => {
          const start = toVNParts(slot.start)
          const end = toVNParts(slot.end)
          events.push({
            key: `pending-${item.applicationId}-${idx}`,
            applicationId: item.applicationId,
            jobId: item.jobId,
            jobTitle: item.jobTitle,
            candidateName: item.candidateName,
            start,
            end,
            durationMinutes: Math.round((new Date(slot.end).getTime() - new Date(slot.start).getTime()) / 60000),
            kind: 'pending',
            meetLink: null,
          })
        })
      }
    })
    return events
  }, [data])

  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>()
    weekDayKeys.forEach((key) => map.set(key, []))
    allEvents.forEach((ev) => {
      const list = map.get(ev.start.dateKey)
      if (list) list.push(ev)
    })
    return map
  }, [allEvents, weekDayKeys])

  const weekConfirmedCount = useMemo(
    () => weekDayKeys.reduce((sum, key) => sum + (eventsByDay.get(key) ?? []).filter((e) => e.kind === 'confirmed').length, 0),
    [eventsByDay, weekDayKeys],
  )
  const weekPendingCount = useMemo(
    () => weekDayKeys.reduce((sum, key) => sum + (eventsByDay.get(key) ?? []).filter((e) => e.kind === 'pending').length, 0),
    [eventsByDay, weekDayKeys],
  )

  const hours = useMemo(() => Array.from({ length: HOUR_END - HOUR_START }, (_, i) => HOUR_START + i), [])
  const gridHeight = (HOUR_END - HOUR_START) * ROW_HEIGHT

  function eventTop(ev: CalendarEvent): number {
    const decimalHour = ev.start.hours + ev.start.minutes / 60
    return Math.max(0, (decimalHour - HOUR_START) * ROW_HEIGHT)
  }

  function eventHeight(ev: CalendarEvent): number {
    return Math.max(22, (ev.durationMinutes / 60) * ROW_HEIGHT - 2)
  }

  function jumpToDate(value: string) {
    if (!value) return
    const [y, m, d] = value.split('-').map(Number)
    setWeekStart(startOfWeekVN({ year: y, month: m - 1, date: d, hours: 0, minutes: 0, dateKey: '' }))
  }

  function openJob(jobId: string) {
    navigate(`/recruiter/interviews/${jobId}`, {
      state: { fromCalendarWeekStart: toVNParts(weekStart).dateKey },
    })
  }

  return (
    <DashboardLayout>
      <div className="cal-page">
        <div className="cal-breadcrumb">
          <span className="cal-bc-link" onClick={() => navigate('/recruiter/interviews')}>Lịch phỏng vấn</span>
          <i className="ti ti-chevron-right" />
          <span className="cal-bc-current">Xem theo tuần</span>
        </div>

        <div className="cal-header">
          <h1 className="cal-title">Lịch phỏng vấn tổng quan</h1>
          <p className="cal-sub">Nhìn nhanh tuần làm việc — lúc nào rảnh, lúc nào đã có lịch phỏng vấn.</p>
        </div>

        <div className="cal-stats">
          <div className="cal-stat-card cal-stat-card--violet">
            <div className="cal-stat-val">{weekConfirmedCount}</div>
            <div className="cal-stat-lbl">Đã xác nhận trong tuần</div>
          </div>
          <div className="cal-stat-card cal-stat-card--amber">
            <div className="cal-stat-val">{weekPendingCount}</div>
            <div className="cal-stat-lbl">Đề xuất chờ ứng viên chọn</div>
          </div>
        </div>

        <div className="cal-toolbar">
          <div className="cal-nav">
            <button className="cal-nav-btn" onClick={() => setWeekStart((w) => addDays(w, -7))} aria-label="Tuần trước">
              <i className="ti ti-chevron-left" />
            </button>
            <button className="cal-today-btn" onClick={() => setWeekStart(startOfWeekVN(toVNParts(new Date())))}>
              Hôm nay
            </button>
            <button className="cal-nav-btn" onClick={() => setWeekStart((w) => addDays(w, 7))} aria-label="Tuần sau">
              <i className="ti ti-chevron-right" />
            </button>
            <label className="cal-jump-label">
              Đi tới ngày
              <input
                type="date"
                className="cal-jump-input"
                value=""
                onChange={(e) => jumpToDate(e.target.value)}
                aria-label="Chọn ngày để xem tuần chứa ngày đó"
              />
            </label>
          </div>
          <div className="cal-week-range">{formatWeekRange(weekStart, weekEnd)}</div>
          <div className="cal-legend">
            <span className="cal-legend-item"><i className="cal-dot cal-dot--confirmed" /> Đã xác nhận</span>
            <span className="cal-legend-item"><i className="cal-dot cal-dot--pending" /> Chờ ứng viên chọn</span>
          </div>
        </div>

        {isLoading ? (
          <div className="cal-empty-state">
            <i className="ti ti-loader-2 cal-spin" />
            <div>Đang tải lịch…</div>
          </div>
        ) : isError ? (
          <div className="cal-empty-state">
            <i className="ti ti-alert-circle" />
            <div>Không tải được lịch phỏng vấn.</div>
          </div>
        ) : (
          <div className="cal-grid-wrap">
            <div className="cal-grid" style={{ gridTemplateColumns: `64px repeat(7, 1fr)` }}>
              <div className="cal-corner" />
              {weekDays.map((day, i) => {
                const key = weekDayKeys[i]
                const isToday = key === todayKey
                return (
                  <div key={key} className={`cal-day-head${isToday ? ' cal-day-head--today' : ''}`}>
                    <div className="cal-day-name">{DAY_LABELS[i]}</div>
                    <div className="cal-day-date">{formatDayLabel(day)}</div>
                  </div>
                )
              })}

              <div className="cal-hour-col" style={{ height: gridHeight }}>
                {hours.map((h) => (
                  <div key={h} className="cal-hour-label" style={{ height: ROW_HEIGHT }}>
                    {pad(h)}:00
                  </div>
                ))}
              </div>

              {weekDays.map((_, i) => {
                const key = weekDayKeys[i]
                const dayEvents = eventsByDay.get(key) ?? []
                return (
                  <div
                    key={key}
                    className="cal-day-col"
                    style={{
                      height: gridHeight,
                      backgroundImage: `repeating-linear-gradient(to bottom, transparent 0, transparent ${ROW_HEIGHT - 1}px, var(--border-default) ${ROW_HEIGHT - 1}px, var(--border-default) ${ROW_HEIGHT}px)`,
                    }}
                  >
                    {dayEvents.map((ev) => (
                      <button
                        key={ev.key}
                        type="button"
                        className={`cal-event cal-event--${ev.kind}`}
                        style={{ top: eventTop(ev), height: eventHeight(ev) }}
                        onClick={() => openJob(ev.jobId)}
                        title={`${ev.candidateName} — ${ev.jobTitle} — ${formatTimeLabel(ev.start)}-${formatTimeLabel(ev.end)}`}
                      >
                        <span className="cal-event-time">{formatTimeLabel(ev.start)}–{formatTimeLabel(ev.end)}</span>
                        <span className="cal-event-name">{ev.candidateName}</span>
                        <span className="cal-event-job">{ev.jobTitle}</span>
                      </button>
                    ))}
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
