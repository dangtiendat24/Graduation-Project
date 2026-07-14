interface Props {
  candidateName: string
  jobTitle: string
  action: 'interviewed' | 'rejected'
  isPending: boolean
  onConfirm: () => void
  onCancel: () => void
}

export default function ConfirmActionModal({
  candidateName,
  jobTitle,
  action,
  isPending,
  onConfirm,
  onCancel,
}: Props) {
  const isReject = action === 'rejected'

  return (
    <div className="rk-overlay" onClick={() => !isPending && onCancel()}>
      <div className="rk-modal" onClick={(e) => e.stopPropagation()}>
        <div className={`rk-modal-icon${isReject ? ' rk-modal-icon--danger' : ''}`}>
          <i className={`ti ${isReject ? 'ti-user-x' : 'ti-calendar-event'}`} />
        </div>
        <h3 className="rk-modal-title">
          {isReject ? 'Từ chối ứng viên?' : 'Mời phỏng vấn ứng viên?'}
        </h3>
        <p className="rk-modal-sub">
          {isReject ? (
            <>Bạn sắp từ chối <strong>{candidateName}</strong> cho vị trí <strong>{jobTitle}</strong>.</>
          ) : (
            <>Bạn sắp mời <strong>{candidateName}</strong> phỏng vấn cho vị trí <strong>{jobTitle}</strong>.</>
          )}
        </p>
        <div className="rk-modal-warning">
          <i className="ti ti-mail" /> Email thông báo sẽ được tự động gửi cho ứng viên.
        </div>
        <div className="rk-modal-actions">
          <button className="rk-btn-ghost" onClick={onCancel} disabled={isPending}>
            Huỷ
          </button>
          <button
            className={isReject ? 'rk-btn-danger' : 'rk-btn-primary'}
            onClick={onConfirm}
            disabled={isPending}
          >
            {isPending ? (
              <><i className="ti ti-loader-2 rk-spin" /> Đang xử lý…</>
            ) : isReject ? (
              'Xác nhận từ chối'
            ) : (
              'Xác nhận mời phỏng vấn'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
