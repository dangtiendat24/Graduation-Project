import { useQuery } from '@tanstack/react-query'
import type { ApplicationStatus } from '../../api/applications'
import { getMyApplicationDetail } from '../../api/candidateApplications'
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

export default function ApplicationDetailModal({ applicationId, onClose }: ApplicationDetailModalProps) {
  const detailQuery = useQuery({
    queryKey: ['candidate-application-detail', applicationId],
    queryFn: () => getMyApplicationDetail(applicationId),
  })

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
                    {i < (detailQuery.data?.statusHistory.length ?? 0) - 1 && <div className="ch-timeline-line" />}
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
