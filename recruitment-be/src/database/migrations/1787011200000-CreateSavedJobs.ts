import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateSavedJobs1787011200000 implements MigrationInterface {
  name = 'CreateSavedJobs1787011200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "saved_jobs" (
        "id"           UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
        "candidate_id" UUID          NOT NULL,
        "job_id"       UUID          NOT NULL,
        "created_at"   TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

        CONSTRAINT "uq_saved_jobs_candidate_id_job_id" UNIQUE ("candidate_id", "job_id"),

        CONSTRAINT "fk_saved_jobs_candidate_id"
          FOREIGN KEY ("candidate_id") REFERENCES "users"("id") ON DELETE CASCADE,

        CONSTRAINT "fk_saved_jobs_job_id"
          FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(
      `CREATE INDEX "idx_saved_jobs_candidate_id" ON "saved_jobs"("candidate_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "saved_jobs" CASCADE`);
  }
}
