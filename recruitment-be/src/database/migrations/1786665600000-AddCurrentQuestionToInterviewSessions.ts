import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * current_question lưu câu hỏi đang chờ ứng viên trả lời trong voice interview (adaptive,
 * sinh từng câu 1 — khác với "questions" của text lưu sẵn cả bộ). Chỉ có ý nghĩa khi
 * mode='voice'; text interview không đọc/ghi cột này.
 */
export class AddCurrentQuestionToInterviewSessions1786665600000 implements MigrationInterface {
  name = 'AddCurrentQuestionToInterviewSessions1786665600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "interview_sessions"
        ADD COLUMN "current_question" JSONB
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "interview_sessions"
        DROP COLUMN "current_question"
    `);
  }
}
