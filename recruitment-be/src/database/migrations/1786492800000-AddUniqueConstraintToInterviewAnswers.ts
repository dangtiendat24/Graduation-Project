import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Trước đây constraint uq_interview_answers_session_question (định nghĩa trong migration
 * CreateInterviewAnswers gốc) bị thiếu trên production — có thể do bị synchronize() xoá vì
 * entity chưa khai báo @Unique tương ứng (xem interview-answer.entity.ts), hoặc do một lần
 * sửa DB thủ công trước đó không được ghi lại thành migration nên không tái lập được.
 * Migration này idempotent: dedupe trước, rồi chỉ thêm constraint nếu chưa có.
 */
export class AddUniqueConstraintToInterviewAnswers1786492800000
  implements MigrationInterface
{
  name = 'AddUniqueConstraintToInterviewAnswers1786492800000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM interview_answers
      WHERE id IN (
        SELECT id FROM (
          SELECT id,
                 ROW_NUMBER() OVER (
                   PARTITION BY session_id, question_id
                   ORDER BY created_at DESC, id DESC
                 ) AS rn
          FROM interview_answers
        ) t
        WHERE t.rn > 1
      )
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'uq_interview_answers_session_question'
        ) THEN
          ALTER TABLE interview_answers
            ADD CONSTRAINT uq_interview_answers_session_question UNIQUE (session_id, question_id);
        END IF;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE interview_answers DROP CONSTRAINT IF EXISTS uq_interview_answers_session_question`,
    );
  }
}
