import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateInterviewAnswers1782921600000 implements MigrationInterface {
  name = 'CreateInterviewAnswers1782921600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "interview_answers" (
        "id"            UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
        "session_id"    UUID          NOT NULL,
        "question_id"   VARCHAR(100)  NOT NULL,
        "question_text" TEXT          NOT NULL,
        "category"      VARCHAR(20)   NOT NULL,
        "difficulty"    VARCHAR(10)   NOT NULL,
        "answer_text"   TEXT          NOT NULL,
        "sub_scores"    JSONB,
        "total_score"   NUMERIC(5,2),
        "created_at"    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

        CONSTRAINT "uq_interview_answers_session_question" UNIQUE ("session_id", "question_id"),

        CONSTRAINT "fk_interview_answers_session_id"
          FOREIGN KEY ("session_id") REFERENCES "interview_sessions"("id") ON DELETE CASCADE,

        CONSTRAINT "chk_interview_answers_category"
          CHECK (category IN ('technical','situational','behavioral')),

        CONSTRAINT "chk_interview_answers_difficulty"
          CHECK (difficulty IN ('easy','medium','hard'))
      )
    `);

    await queryRunner.query(
      `CREATE INDEX "idx_interview_answers_session_id" ON "interview_answers"("session_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "interview_answers" CASCADE`);
  }
}
