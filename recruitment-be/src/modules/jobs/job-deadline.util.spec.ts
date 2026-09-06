import { isDeadlinePassed, todayIso } from './job-deadline.util';

function shiftDays(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

describe('job-deadline.util', () => {
  describe('todayIso', () => {
    it('trả về ngày UTC dạng YYYY-MM-DD', () => {
      expect(todayIso()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });

  describe('isDeadlinePassed', () => {
    it('tin không đặt hạn thì không bao giờ quá hạn', () => {
      expect(isDeadlinePassed(null)).toBe(false);
    });

    it('hạn đúng hôm nay vẫn CHƯA quá hạn — ứng viên còn được nộp trong ngày cuối', () => {
      expect(isDeadlinePassed(todayIso())).toBe(false);
    });

    it('hạn hôm qua là đã quá hạn', () => {
      expect(isDeadlinePassed(shiftDays(todayIso(), -1))).toBe(true);
    });

    it('hạn ngày mai thì chưa quá hạn', () => {
      expect(isDeadlinePassed(shiftDays(todayIso(), 1))).toBe(false);
    });

    it('so sánh theo ngày lịch chứ không theo thứ tự chuỗi ngẫu nhiên (qua mốc năm)', () => {
      expect(isDeadlinePassed('2020-12-31')).toBe(true);
      expect(isDeadlinePassed('2999-01-01')).toBe(false);
    });
  });
});
