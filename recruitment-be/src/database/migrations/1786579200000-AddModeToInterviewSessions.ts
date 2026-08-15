import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Thêm cột "mode" cho interview_sessions để hỗ trợ phỏng vấn AI bằng giọng nói (voice)
 * song song với phỏng vấn văn bản (text) hiện có, dùng chung 1 session/đơn ứng tuyển.
 * Default 'text' giữ nguyên hành vi cho mọi session cũ và mọi code path text hiện tại
 * (không đọc/ghi cột này) — mode chỉ được set tường minh bởi luồng tạo session voice mới.
 */
export class AddModeToInterviewSessions1786579200000 implements MigrationInterface {
  name = 'AddModeToInterviewSessions1786579200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "interview_sessions"
        ADD COLUMN "mode" VARCHAR(10) NOT NULL DEFAULT 'text'
    `);

    await queryRunner.query(`
      ALTER TABLE "interview_sessions"
        ADD CONSTRAINT "chk_interview_sessions_mode"
          CHECK (mode IN ('text','voice'))
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "interview_sessions"
        DROP CONSTRAINT "chk_interview_sessions_mode"
    `);
    await queryRunner.query(`
      ALTER TABLE "interview_sessions"
        DROP COLUMN "mode"
    `);
  }
}
