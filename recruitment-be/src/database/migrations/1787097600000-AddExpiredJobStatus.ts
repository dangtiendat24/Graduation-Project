import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Tách 'expired' (hệ thống tự đóng vì quá hạn nộp) khỏi 'closed' (recruiter chủ động đóng).
 *
 * Hai loại này hiển thị khác nhau với ứng viên: tin quá hạn vẫn xem được ở trang công ty để
 * ứng viên biết công ty từng tuyển vị trí gì, còn tin recruiter tự đóng thì chỉ recruiter thấy.
 * Nếu chỉ suy ra từ deadline như trước thì một tin recruiter đóng sớm sẽ tự biến thành "hết hạn"
 * ngay khi deadline trôi qua, và lọt ra trang công ty ngoài ý muốn.
 *
 * KHÔNG backfill 'closed' + quá hạn → 'expired': trước migration này chưa có cơ chế tự đóng nào,
 * nên mọi tin 'closed' hiện có đều do recruiter tự đóng. Chuyển chúng sang 'expired' sẽ vô tình
 * công khai tin mà recruiter đã chủ động ẩn. Tin 'active' quá hạn sẽ tự thành 'expired' ở lượt
 * đọc kế tiếp (JobsService.closeExpiredJobs).
 */
export class AddExpiredJobStatus1787097600000 implements MigrationInterface {
  name = 'AddExpiredJobStatus1787097600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "jobs" DROP CONSTRAINT IF EXISTS "chk_jobs_status"`,
    );
    await queryRunner.query(
      `ALTER TABLE "jobs" ADD CONSTRAINT "chk_jobs_status" CHECK (status IN ('draft','active','closed','expired'))`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Gộp ngược 'expired' về 'closed' để không vi phạm CHECK constraint cũ
    await queryRunner.query(
      `UPDATE "jobs" SET status = 'closed' WHERE status = 'expired'`,
    );
    await queryRunner.query(
      `ALTER TABLE "jobs" DROP CONSTRAINT IF EXISTS "chk_jobs_status"`,
    );
    await queryRunner.query(
      `ALTER TABLE "jobs" ADD CONSTRAINT "chk_jobs_status" CHECK (status IN ('draft','active','closed'))`,
    );
  }
}
