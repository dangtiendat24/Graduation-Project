export interface NotificationPreferences {
  /** Email khi có ứng viên mới nộp CV vào 1 trong các tin tuyển dụng của recruiter */
  newApplication: boolean;
  /** Email khi ứng viên xác nhận khung giờ phỏng vấn */
  scheduleConfirmed: boolean;
  /** Email khi AI chấm điểm CV xong (matching hoàn tất) */
  matchingComplete: boolean;
}

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  newApplication: true,
  scheduleConfirmed: true,
  matchingComplete: true,
};

/** `prefs` null (recruiter chưa từng cấu hình) → coi như bật hết, theo DEFAULT_NOTIFICATION_PREFERENCES */
export function shouldNotify(
  prefs: NotificationPreferences | null,
  key: keyof NotificationPreferences,
): boolean {
  return (prefs ?? DEFAULT_NOTIFICATION_PREFERENCES)[key] !== false;
}
