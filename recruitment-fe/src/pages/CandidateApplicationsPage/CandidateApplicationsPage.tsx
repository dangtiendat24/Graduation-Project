import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import CandidateLayout from '../../layouts/CandidateLayout/CandidateLayout'
import type { ApplicationStatus } from '../../api/applications'
import ApplicationDetailModal from '../../components/ApplicationDetailModal/ApplicationDetailModal'
import { getMyApplications } from '../../api/candidateApplications'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Building2,
  Calendar,
  Clock,
  MapPin,
  Sparkles,
  Bot,
  Video,
  ChevronRight,
  CheckCircle2,
  XCircle,
  Clock3,
  CalendarCheck
} from 'lucide-react'
import './CandidateApplicationsPage.css'

const STATUS_CONFIG: Record<ApplicationStatus, { label: string; clsPrefix: string; icon: any }> = {
  pending: { label: 'Đã nộp đơn', clsPrefix: 'st-pending', icon: Clock3 },
  matched: { label: 'Hồ sơ phù hợp', clsPrefix: 'st-matched', icon: Sparkles },
  interviewed: { label: 'Đã phỏng vấn AI', clsPrefix: 'st-interviewed', icon: Bot },
  schedule_sent: { label: 'Chờ xác nhận lịch', clsPrefix: 'st-schedule_sent', icon: Calendar },
  scheduled: { label: 'Đã xác nhận lịch', clsPrefix: 'st-scheduled', icon: CalendarCheck },
  completed: { label: 'Đã phỏng vấn xong', clsPrefix: 'st-completed', icon: CheckCircle2 },
  hired: { label: 'Được tuyển dụng', clsPrefix: 'st-hired', icon: CheckCircle2 },
  rejected: { label: 'Không phù hợp', clsPrefix: 'st-rejected', icon: XCircle },
}

type FilterTab = 'all' | 'in_progress' | 'interview' | 'done'

function getInitials(name: string): string {
  return name.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase()
}

function formatDate(iso: string): string {
  if (!iso) return ''
  const d = new Date(iso)
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
}

function formatDateTime(iso: string): string {
  if (!iso) return ''
  const d = new Date(iso)
  return `${formatDate(iso)} · ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

export default function CandidateApplicationsPage() {
  const [activeTab, setActiveTab] = useState<FilterTab>('all')
  const [detailId, setDetailId] = useState<string | null>(null)

  const { data, isLoading, isError } = useQuery({
    queryKey: ['candidate-applications', 'list'],
    queryFn: () => getMyApplications({ limit: 100 }),
  })
  const applications = useMemo(() => data?.data ?? [], [data])

  const total = applications.length
  const inProgressCount = applications.filter(a => ['pending', 'matched', 'interviewed', 'schedule_sent', 'scheduled'].includes(a.status)).length
  const interviewCount = applications.filter(a => ['schedule_sent', 'scheduled'].includes(a.status)).length

  const filteredApplications = useMemo(() => {
    return applications.filter(app => {
      if (activeTab === 'all') return true
      if (activeTab === 'in_progress') return ['pending', 'matched', 'interviewed'].includes(app.status)
      if (activeTab === 'interview') return ['schedule_sent', 'scheduled', 'completed'].includes(app.status)
      if (activeTab === 'done') return ['hired', 'rejected'].includes(app.status)
      return true
    })
  }, [applications, activeTab])

  const tabs: { id: FilterTab; label: string }[] = [
    { id: 'all', label: 'Tất cả' },
    { id: 'in_progress', label: 'Đang xử lý' },
    { id: 'interview', label: 'Phỏng vấn' },
    { id: 'done', label: 'Đã hoàn tất' },
  ]

  return (
    <CandidateLayout>
      <div className="ca-hero">
        <div className="ca-hero-left">
          <h1 className="ca-hero-title">Quản lý đơn ứng tuyển</h1>
          <p className="ca-hero-sub">Theo dõi chi tiết trạng thái, lịch phỏng vấn và đánh giá AI</p>
        </div>
        
        <div className="ca-hero-stats">
          <div className="ca-stat-box">
            <div className="ca-stat-num ca-stat-teal">{total}</div>
            <div className="ca-stat-label">Tổng số</div>
          </div>
          <div className="ca-stat-box">
            <div className="ca-stat-num ca-stat-amber">{inProgressCount}</div>
            <div className="ca-stat-label">Đang xử lý</div>
          </div>
          <div className="ca-stat-box">
            <div className="ca-stat-num ca-stat-violet">{interviewCount}</div>
            <div className="ca-stat-label">Lịch hẹn</div>
          </div>
        </div>
      </div>

      <div className="ca-filters">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`ca-filter-btn ${activeTab === tab.id ? 'active' : ''}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="ca-list">
        {isLoading && <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>Đang tải danh sách đơn ứng tuyển...</div>}
        {isError && <div style={{ padding: '40px', textAlign: 'center', color: 'var(--color-danger)' }}>Lỗi tải dữ liệu. Vui lòng thử lại.</div>}
        {!isLoading && !isError && filteredApplications.length === 0 && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', background: 'var(--bg-surface)', borderRadius: 'var(--radius-lg)', border: '1px dashed var(--border-default)' }}
          >
            Chưa có đơn ứng tuyển nào ở trạng thái này.
          </motion.div>
        )}
        
        <AnimatePresence mode="popLayout">
          {filteredApplications.map((app, index) => {
            const companyName = app.job.company?.name ?? 'N/A'
            const logo = app.job.company?.logoUrl
            const config = STATUS_CONFIG[app.status] || STATUS_CONFIG.pending
            const StatusIcon = config.icon

            return (
              <motion.div
                layout
                key={app.applicationId}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2, delay: index * 0.05 }}
                className="ca-card"
              >
                <div className={`ca-card-border ${config.clsPrefix}-bd`} />
                
                <div className="ca-card-main">
                  {/* Left Column */}
                  <div className="ca-job-info">
                    <div className="ca-logo">
                      {logo ? (
                        <img src={logo} alt={companyName} />
                      ) : (
                        getInitials(companyName)
                      )}
                    </div>
                    <div className="ca-job-details">
                      <h3 className="ca-job-title">{app.job.title}</h3>
                      <div className="ca-job-meta">
                        <span><Building2 size={16} /> {companyName}</span>
                        <span><MapPin size={16} /> {app.job.location}</span>
                      </div>
                    </div>
                  </div>

                  {/* Middle Column */}
                  <div className="ca-scores">
                    <div className="ca-score-group">
                      <div className="ca-score-label">
                        <Sparkles size={14} className="ca-text-indigo" /> Điểm AI Matching
                      </div>
                      {app.matching?.overallScore != null ? (
                        <div className="ca-progress-wrap">
                          <div className="ca-progress-bar">
                            <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: `${app.matching.overallScore}%` }}
                              transition={{ duration: 1, ease: 'easeOut' }}
                              className="ca-progress-fill ca-bg-indigo" 
                            />
                          </div>
                          <span className="ca-progress-text ca-text-indigo">{app.matching.overallScore}%</span>
                        </div>
                      ) : (
                        <span style={{ fontSize: 'var(--fs-label)', color: 'var(--text-muted)', fontStyle: 'italic' }}>Đang phân tích...</span>
                      )}
                    </div>

                    {['interviewed', 'schedule_sent', 'scheduled', 'completed', 'hired', 'rejected'].includes(app.status) && app.interview?.overallScore != null && (
                      <div className="ca-score-group">
                        <div className="ca-score-label">
                          <Bot size={14} className="ca-text-teal" /> Điểm phỏng vấn AI
                        </div>
                        <div className="ca-progress-wrap">
                          <div className="ca-progress-bar">
                            <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: `${app.interview.overallScore * 10}%` }}
                              transition={{ duration: 1, ease: 'easeOut', delay: 0.2 }}
                              className="ca-progress-fill ca-bg-teal" 
                            />
                          </div>
                          <span className="ca-progress-text ca-text-teal">{app.interview.overallScore}/10</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Right Column */}
                  <div className="ca-status-area">
                    <div className={`ca-badge ${config.clsPrefix}-bg`}>
                      <StatusIcon size={16} strokeWidth={2.5} />
                      {config.label}
                    </div>

                    {app.schedule && app.schedule.status !== 'cancelled' ? (
                      <div className="ca-schedule-info">
                        <span className="ca-schedule-time">{formatDateTime(app.schedule.confirmedStartTime || '')}</span>
                        {app.schedule.meetLink && (
                          <a href={app.schedule.meetLink} target="_blank" rel="noreferrer" className="ca-btn-meet">
                            <Video size={16} /> Tham gia Meet
                          </a>
                        )}
                      </div>
                    ) : (
                      <div className="ca-applied-date">
                        <Clock size={14} /> Ngày nộp: {formatDate(app.appliedAt)}
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer Bar */}
                <div className="ca-card-footer">
                  <div className="ca-footer-left">
                    {app.autoRejected ? (
                      <span className="ca-auto-reject"><XCircle size={16} /> Bị từ chối tự động</span>
                    ) : (
                      <span className="ca-app-id">Mã đơn: {app.applicationId}</span>
                    )}
                  </div>
                  <button className="ca-btn-detail" onClick={() => setDetailId(app.applicationId)}>
                    Xem chi tiết tiến trình <ChevronRight size={16} />
                  </button>
                </div>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>

      {detailId && (
        <ApplicationDetailModal
          applicationId={detailId}
          onClose={() => setDetailId(null)}
        />
      )}
    </CandidateLayout>
  )
}
