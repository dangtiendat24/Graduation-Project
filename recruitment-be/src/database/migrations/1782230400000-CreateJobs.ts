import { MigrationInterface, QueryRunner } from 'typeorm'

export class CreateJobs1782230400000 implements MigrationInterface {
  name = 'CreateJobs1782230400000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "jobs" (
        "id"               UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
        "recruiter_id"     UUID         NOT NULL,
        "company_id"       UUID,
        "title"            VARCHAR(255) NOT NULL,
        "department"       VARCHAR(100),
        "level"            VARCHAR(20),
        "location"         VARCHAR(255),
        "headcount"        SMALLINT     NOT NULL DEFAULT 1,
        "work_model"       VARCHAR(10),
        "description"      TEXT         NOT NULL,
        "requirements"     TEXT         NOT NULL,
        "required_skills"  JSONB,
        "min_experience"   VARCHAR(20),
        "salary_range"     VARCHAR(100),
        "job_perks"        JSONB,
        "status"           VARCHAR(20)  NOT NULL DEFAULT 'draft',
        "deadline"         DATE,
        "created_at"       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
        "updated_at"       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

        CONSTRAINT "fk_jobs_recruiter_id"
          FOREIGN KEY ("recruiter_id") REFERENCES "users"("id") ON DELETE CASCADE,

        CONSTRAINT "fk_jobs_company_id"
          FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE SET NULL,

        CONSTRAINT "chk_jobs_level"
          CHECK (level IS NULL OR level IN ('intern','junior','middle','senior','lead','director')),

        CONSTRAINT "chk_jobs_work_model"
          CHECK (work_model IS NULL OR work_model IN ('onsite','hybrid','remote')),

        CONSTRAINT "chk_jobs_status"
          CHECK (status IN ('draft','active','closed')),

        CONSTRAINT "chk_jobs_headcount"
          CHECK (headcount >= 1)
      )
    `)

    await queryRunner.query(`CREATE INDEX "idx_jobs_recruiter_id" ON "jobs"("recruiter_id")`)
    await queryRunner.query(`CREATE INDEX "idx_jobs_company_id"   ON "jobs"("company_id")`)
    await queryRunner.query(`CREATE INDEX "idx_jobs_status"       ON "jobs"("status")`)
    await queryRunner.query(`CREATE INDEX "idx_jobs_deadline"     ON "jobs"("deadline")`)
    await queryRunner.query(
      `CREATE INDEX "idx_jobs_active" ON "jobs"("created_at" DESC) WHERE status = 'active'`,
    )
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "jobs" CASCADE`)
  }
}
