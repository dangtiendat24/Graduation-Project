import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddInterviewGenerationFields1783008000000 implements MigrationInterface {
  name = 'AddInterviewGenerationFields1783008000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "interview_sessions"
        ADD COLUMN "questions" JSONB,
        ADD COLUMN "questions_status" VARCHAR(20) NOT NULL DEFAULT 'pending',
        ADD COLUMN "questions_error" TEXT,
        ADD COLUMN "scoring_status" VARCHAR(20) NOT NULL DEFAULT 'pending',
        ADD COLUMN "scoring_error" TEXT,
        ADD COLUMN "transcript" TEXT
    `);

    await queryRunner.query(`
      ALTER TABLE "interview_sessions"
        ADD CONSTRAINT "chk_interview_sessions_questions_status"
          CHECK (questions_status IN ('pending','processing','done','error')),
        ADD CONSTRAINT "chk_interview_sessions_scoring_status"
          CHECK (scoring_status IN ('pending','processing','done','error'))
    `);

    await queryRunner.query(`
      ALTER TABLE "interview_sessions"
        DROP CONSTRAINT IF EXISTS "chk_interview_sessions_status"
    `);
    await queryRunner.query(`
      ALTER TABLE "interview_sessions"
        ADD CONSTRAINT "chk_interview_sessions_status"
          CHECK (status IN ('pending','in_progress','completed','timeout','cancelled'))
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "interview_sessions"
        DROP CONSTRAINT IF EXISTS "chk_interview_sessions_status"
    `);
    await queryRunner.query(`
      ALTER TABLE "interview_sessions"
        ADD CONSTRAINT "chk_interview_sessions_status"
          CHECK (status IN ('pending','in_progress','completed','timeout'))
    `);

    await queryRunner.query(`
      ALTER TABLE "interview_sessions"
        DROP CONSTRAINT "chk_interview_sessions_questions_status",
        DROP CONSTRAINT "chk_interview_sessions_scoring_status"
    `);

    await queryRunner.query(`
      ALTER TABLE "interview_sessions"
        DROP COLUMN "questions",
        DROP COLUMN "questions_status",
        DROP COLUMN "questions_error",
        DROP COLUMN "scoring_status",
        DROP COLUMN "scoring_error",
        DROP COLUMN "transcript"
    `);
  }
}
