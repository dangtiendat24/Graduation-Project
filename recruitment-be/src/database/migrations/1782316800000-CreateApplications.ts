import { MigrationInterface, QueryRunner } from 'typeorm'

export class CreateApplications1782316800000 implements MigrationInterface {
  name = 'CreateApplications1782316800000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "applications" (
        "id"           UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
        "candidate_id" UUID          NOT NULL,
        "job_id"       UUID          NOT NULL,
        "cv_url"       VARCHAR(1000) NOT NULL,
        "status"       VARCHAR(20)   NOT NULL DEFAULT 'pending',
        "created_at"   TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
        "updated_at"   TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

        CONSTRAINT "fk_applications_candidate_id"
          FOREIGN KEY ("candidate_id") REFERENCES "users"("id") ON DELETE CASCADE,

        CONSTRAINT "fk_applications_job_id"
          FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE CASCADE,

        CONSTRAINT "chk_applications_status"
          CHECK (status IN ('pending','matched','interviewed','schedule_sent','scheduled','completed','hired','rejected'))
      )
    `)

    await queryRunner.query(`CREATE INDEX "idx_applications_candidate_id" ON "applications"("candidate_id")`)
    await queryRunner.query(`CREATE INDEX "idx_applications_job_id"       ON "applications"("job_id")`)
    await queryRunner.query(`CREATE INDEX "idx_applications_status"       ON "applications"("status")`)
    await queryRunner.query(
      `CREATE INDEX "idx_applications_candidate_job" ON "applications"("candidate_id", "job_id")`,
    )
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "applications" CASCADE`)
  }
}
