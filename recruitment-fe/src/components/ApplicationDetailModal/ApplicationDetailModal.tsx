import React from 'react'
import type { ApplicationStatus } from '../../api/applications'
import type { MyApplicationListItem, MyApplicationDetail } from '../../api/candidateApplications'
import './ApplicationDetailModal.css'

interface ApplicationDetailModalProps {
  applicationId: string
  onClose: () => void
}

const STATUS_LABELS: Record<ApplicationStatus, string> = {
  pending: 'Đã nộp đơn',
  matched: 'Hồ sơ phù hợp',
  interviewed: 'Đã phỏng vấn AI',
  schedule_sent: 'Đang chờ xác nhận lịch',
  scheduled: 'Đã xác nhận lịch',
  completed: 'Đã hoàn thành phỏng vấn',
  hired: 'Được tuyển dụng',
  rejected: 'Không phù hợp',
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
}

function formatDateTime(iso: string): string {
  const d = new Date(iso)
  return `${formatDate(iso)} · ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

const MOCK_APPLICATIONS: MyApplicationListItem[] = [
  {
    applicationId: 'app-1',
    appliedAt: '2026-06-20T08:00:00Z',
    updatedAt: '2026-06-21T08:00:00Z',
    status: 'pending',
    job: {
      id: 'job-1',
      title: 'Senior Node.js Developer',
      department: 'Engineering',
      level: 'Senior',
      location: 'Hà Nội',
      workModel: 'Hybrid',
      salaryRange: '25–35 tr/tháng',
      company: { name: 'TechVision', logoUrl: null }
    },
    matching: { overallScore: 92, recommendation: 'strong_match' },
    interview: null,
    schedule: null,
  },
  {
    applicationId: 'app-2',
    appliedAt: '2026-06-15T08:00:00Z',
    updatedAt: '2026-06-16T08:00:00Z',
    status: 'schedule_sent',
    job: {
      id: 'job-2',
      title: 'Backend Engineer (NestJS)',
      department: 'Engineering',
      level: 'Middle',
      location: 'TP. HCM',
      workModel: 'Onsite',
      salaryRange: '20–30 tr/tháng',
      company: { name: 'Zalo', logoUrl: null }
    },
    matching: { overallScore: 85, recommendation: 'good_match' },
    interview: { status: 'completed', overallScore: 8.5 },
    schedule: {
      status: 'pending',
      confirmedStartTime: '2026-06-25T14:00:00Z',
      meetLink: 'https://meet.google.com/abc-xyz-def'
    },
  },
  {
    applicationId: 'app-3',
    appliedAt: '2026-06-10T08:00:00Z',
    updatedAt: '2026-06-10T09:00:00Z',
    status: 'rejected',
    autoRejected: true,
    job: {
      id: 'job-3',
      title: 'Data Analyst',
      department: 'Data',
      level: 'Junior',
      location: 'Đà Nẵng',
      workModel: 'Remote',
      salaryRange: '15-20 tr/tháng',
      company: { name: 'VNG', logoUrl: null }
    },
    matching: { overallScore: 40, recommendation: 'poor_match' },
    interview: null,
    schedule: null,
  }
]

export default function ApplicationDetailModal({ applicationId, onClose }: ApplicationDetailModalProps) {
  const baseApp = MOCK_APPLICATIONS.find(a => a.applicationId === applicationId)
  const detailQuery = {
    isLoading: false,
    isError: !baseApp,
    data: baseApp ? {
      ...baseApp,
      statusHistory: [
        { fromStatus: null, toStatus: 'pending' as ApplicationStatus, changedAt: baseApp.appliedAt, label: 'Nộp đơn ứng tuyển thành công' },
        { fromStatus: 'pending' as ApplicationStatus, toStatus: baseApp.status, changedAt: baseApp.updatedAt, label: `Trạng thái hiện tại: ${STATUS_LABELS[baseApp.status]}` }
      ]
    } as MyApplicationDetail : null
  }

  return (
    <div className="ch-overlay" onClick={onClose}>
      <div className="ch-detail-modal" onClick={(e) => e.stopPropagation()}>
        {detailQuery.isLoading ? (
          <div className="ch-empty-state">Đang tải chi tiết đơn ứng tuyển...</div>
        ) : detailQuery.isError || !detailQuery.data ? (
          <div className="ch-empty-state">Không tải được chi tiết đơn ứng tuyển.</div>
        ) : (
          <>
            <h3 className="ch-detail-title">{detailQuery.data.job.title}</h3>
            <p className="ch-detail-sub">{detailQuery.data.job.company?.name ?? 'N/A'}</p>
            <div className="ch-detail-status">
              <span className={`ch-badge bd-${detailQuery.data.status}`}>
                {STATUS_LABELS[detailQuery.data.status]}
              </span>
              {detailQuery.data.autoRejected && (
                <span className="ch-auto-rejected-note" style={{ marginLeft: 8, display: 'inline-block' }}>
                  Hồ sơ bị từ chối tự động do điểm matching thấp
                </span>
              )}
            </div>
            <div className="ch-timeline">
              {detailQuery.data.statusHistory.map((h, i) => (
                <div key={i} className="ch-timeline-item">
                  <div className="ch-timeline-rail">
                    <div className="ch-timeline-dot" />
                    {i < detailQuery.data.statusHistory.length - 1 && <div className="ch-timeline-line" />}
                  </div>
                  <div className="ch-timeline-content">
                    <div className="ch-timeline-label">{h.label}</div>
                    <div className="ch-timeline-date">{formatDateTime(h.changedAt)}</div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
        <button className="ch-detail-close-btn" onClick={onClose}>Đóng</button>
      </div>
    </div>
  )
}
