import type { Job } from '../api/jobs'

/**
 * Hạn nộp hồ sơ là cột DATE ('YYYY-MM-DD'). Mốc "hôm nay" lấy theo UTC cho khớp với BE
 * (recruitment-be/src/modules/jobs/job-deadline.util.ts) — nếu FE dùng giờ local còn BE dùng
 * UTC thì cùng một tin sẽ lúc hiện "Hết hạn" lúc không, tuỳ thời điểm trong ngày.
 */
export function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

export function isDeadlinePassed(deadline: string | null): boolean {
  return !!deadline && deadline < todayIso()
}

/**
 * BE tự chuyển tin quá hạn sang status riêng 'expired' (khác 'closed' là recruiter chủ động
 * đóng), nên chỉ cần đọc status — không suy ra từ deadline nữa.
 */
export function isExpiredJob(job: Pick<Job, 'status'>): boolean {
  return job.status === 'expired'
}

/** Tin còn nhận hồ sơ hay không — dùng để khoá nút ứng tuyển phía ứng viên. */
export function isOpenForApplication(job: Pick<Job, 'status' | 'deadline'>): boolean {
  return job.status === 'active' && !isDeadlinePassed(job.deadline)
}
