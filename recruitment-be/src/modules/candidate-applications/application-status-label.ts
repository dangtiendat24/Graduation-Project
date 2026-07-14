import { ApplicationStatus } from '../applications/application.entity';

/** Nhãn tiếng Việt cho từng trạng thái đơn ứng tuyển, dùng cho timeline UI */
export const APPLICATION_STATUS_LABELS: Record<ApplicationStatus, string> = {
  pending: 'Đã nộp đơn',
  matched: 'Hồ sơ phù hợp',
  interviewed: 'Đã phỏng vấn AI',
  schedule_sent: 'Đang chờ xác nhận lịch',
  scheduled: 'Đã xác nhận lịch',
  completed: 'Đã hoàn thành phỏng vấn',
  hired: 'Được tuyển dụng',
  rejected: 'Không phù hợp',
};
