interface Props {
  candidateName: string
  jobTitle: string
  action: 'rejected'
  isPending: boolean
  onConfirm: () => void
  onCancel: () => void
}

export default function ConfirmActionModal({
  candidateName,
  jobTitle,
  isPending,
  onConfirm,
  onCancel,
}: Props) {
  return (
    <div className="rk-overlay" onClick={() => !isPending && onCancel()}>
      <div className="rk-modal" onClick={(e) => e.stopPropagation()}>
        <div className="rk-modal-icon rk-modal-icon--danger">
          <i className="ti ti-user-x" />
        </div>
        <h3 className="rk-modal-title">Từ chối ứng viên?</h3>
        <p className="rk-modal-sub">
          Bạn sắp từ chối <strong>{candidateName}</strong> cho vị trí <strong>{jobTitle}</strong>.
        </p>
        <div className="rk-modal-warning">
          <i className="ti ti-mail" /> Email thông báo sẽ được tự động gửi cho ứng viên.
        </div>
        <div className="rk-modal-actions">
          <button className="rk-btn-ghost" onClick={onCancel} disabled={isPending}>
            Huỷ
          </button>
          <button className="rk-btn-danger" onClick={onConfirm} disabled={isPending}>
            {isPending ? (
              <><i className="ti ti-loader-2 rk-spin" /> Đang xử lý…</>
            ) : (
              'Xác nhận từ chối'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
