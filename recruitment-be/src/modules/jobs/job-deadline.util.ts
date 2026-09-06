/**
 * Tiện ích so hạn nộp hồ sơ (cột DATE `jobs.deadline`, dạng 'YYYY-MM-DD').
 *
 * Mốc ngày lấy theo UTC ở cả TypeScript lẫn SQL (xem SQL_TODAY) để hai nơi luôn cho cùng kết
 * quả, không phụ thuộc timezone của Node process hay của Postgres — nếu một bên dùng giờ local
 * còn bên kia dùng UTC thì cùng một tin sẽ lúc quá hạn lúc chưa, tuỳ thời điểm trong ngày.
 */

/** Hôm nay (UTC) dạng 'YYYY-MM-DD' — cùng định dạng cột DATE nên so sánh chuỗi là chính xác. */
export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Biểu thức SQL cho "hôm nay" khớp với todayIso() ở trên. */
export const SQL_TODAY = "(NOW() AT TIME ZONE 'UTC')::date";

/** Tin đã quá hạn nộp hồ sơ chưa? Tin không đặt hạn (null) thì không bao giờ quá hạn. */
export function isDeadlinePassed(deadline: string | null): boolean {
  return !!deadline && deadline < todayIso();
}
