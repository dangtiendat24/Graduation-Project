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
 * Tin quá hạn được BE tự chuyển sang 'closed'. Để tách khỏi tin recruiter chủ động đóng khi
 * hạn vẫn còn hiệu lực, FE phân loại thêm bằng chính deadline.
 */
export function isExpiredJob(job: Pick<Job, 'status' | 'deadline'>): boolean {
  return job.status === 'closed' && isDeadlinePassed(job.deadline)
}
