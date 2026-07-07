import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateInterviewSessions1782576000000 implements MigrationInterface {
  name = 'CreateInterviewSessions1782576000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "interview_sessions" (
        "id"              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
        "application_id"  UUID          NOT NULL,
        "status"          VARCHAR(20)   NOT NULL DEFAULT 'pending',
        "overall_score"   NUMERIC(5,2),
        "started_at"      TIMESTAMPTZ,
        "completed_at"    TIMESTAMPTZ,
        "created_at"      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
        "updated_at"      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

        CONSTRAINT "uq_interview_sessions_application_id" UNIQUE ("application_id"),

        CONSTRAINT "fk_interview_sessions_application_id"
          FOREIGN KEY ("application_id") REFERENCES "applications"("id") ON DELETE CASCADE,

        CONSTRAINT "chk_interview_sessions_status"
          CHECK (status IN ('pending','in_progress','completed','timeout'))
      )
    `);

    await queryRunner.query(
      `CREATE INDEX "idx_interview_sessions_application_id" ON "interview_sessions"("application_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP TABLE IF EXISTS "interview_sessions" CASCADE`,
    );
  }
}
