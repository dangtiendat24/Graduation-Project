interface Props {
  candidateName: string
  jobTitle: string
  action: 'hired' | 'rejected' | 'completed'
  isPending: boolean
  onConfirm: () => void
  onCancel: () => void
}

export default function InterviewOutcomeModal({
  candidateName,
  jobTitle,
  action,
  isPending,
  onConfirm,
  onCancel,
}: Props) {
  const isHire = action === 'hired'
  const isCompleted = action === 'completed'

  return (
    <div className="ri-overlay" onClick={() => !isPending && onCancel()}>
      <div className="ri-box ri-outcome-box" onClick={(e) => e.stopPropagation()}>
        <div className="ri-box-header">
          <div>
            <div className="ri-box-title">
              {isCompleted
                ? 'Đánh dấu đã phỏng vấn?'
                : isHire
                  ? 'Xác nhận tuyển ứng viên?'
                  : 'Từ chối ứng viên?'}
            </div>
            <div className="ri-box-sub">
              {isCompleted ? (
                <>
                  Bạn sắp đánh dấu <strong>{candidateName}</strong> đã hoàn thành phỏng vấn cho vị
                  trí <strong>{jobTitle}</strong>, dù có thể chưa tới giờ hẹn trong lịch. Sau khi
                  đánh dấu, bạn có thể quyết định tuyển hoặc từ chối ứng viên này.
                </>
              ) : (
                <>
                  Bạn sắp đánh dấu <strong>{candidateName}</strong>{' '}
                  {isHire ? 'đã được tuyển' : 'bị từ chối'} cho vị trí <strong>{jobTitle}</strong>.
                </>
              )}
            </div>
          </div>
          <button className="ri-box-close" onClick={onCancel} disabled={isPending}>
            <i className="ti ti-x" />
          </button>
        </div>

        <div className="ri-box-body">
          {action === 'rejected' && (
            <div className="ri-note">
              <i className="ti ti-mail" /> Email thông báo sẽ được tự động gửi cho ứng viên.
            </div>
          )}
        </div>

        <div className="ri-box-actions">
          <button className="ri-btn-ghost" onClick={onCancel} disabled={isPending}>
            Huỷ
          </button>
          <button
            className={isCompleted ? 'ri-btn-primary' : isHire ? 'ri-btn-success' : 'ri-btn-danger'}
            onClick={onConfirm}
            disabled={isPending}
          >
            {isPending ? (
              <>
                <i className="ti ti-loader-2 ri-spin" /> Đang xử lý…
              </>
            ) : isCompleted ? (
              'Xác nhận đã phỏng vấn'
            ) : isHire ? (
              'Xác nhận tuyển'
            ) : (
              'Xác nhận từ chối'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
