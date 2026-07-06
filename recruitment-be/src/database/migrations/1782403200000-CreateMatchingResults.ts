import { MigrationInterface, QueryRunner } from 'typeorm'

export class CreateMatchingResults1782403200000 implements MigrationInterface {
  name = 'CreateMatchingResults1782403200000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "matching_results" (
        "id"              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
        "application_id"  UUID          NOT NULL,
        "overall_score"   NUMERIC(5,2)  NOT NULL,
        "recommendation"  VARCHAR(20)   NOT NULL,
        "criteria"        JSONB         NOT NULL,
        "explanation"     TEXT,
        "created_at"      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
        "updated_at"      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

        CONSTRAINT "uq_matching_results_application_id" UNIQUE ("application_id"),

        CONSTRAINT "fk_matching_results_application_id"
          FOREIGN KEY ("application_id") REFERENCES "applications"("id") ON DELETE CASCADE,

        CONSTRAINT "chk_matching_results_recommendation"
          CHECK (recommendation IN ('strong_match','good_match','partial_match','poor_match'))
      )
    `)

    await queryRunner.query(
      `CREATE INDEX "idx_matching_results_application_id" ON "matching_results"("application_id")`,
    )
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "matching_results" CASCADE`)
  }
}
