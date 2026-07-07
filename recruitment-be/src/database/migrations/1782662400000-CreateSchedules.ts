import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateSchedules1782662400000 implements MigrationInterface {
  name = 'CreateSchedules1782662400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "schedules" (
        "id"                    UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
        "application_id"        UUID          NOT NULL,
        "status"                VARCHAR(20)   NOT NULL DEFAULT 'pending',
        "confirmed_start_time"  TIMESTAMPTZ,
        "confirmed_end_time"    TIMESTAMPTZ,
        "meet_link"             VARCHAR(500),
        "created_at"            TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
        "updated_at"            TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

        CONSTRAINT "uq_schedules_application_id" UNIQUE ("application_id"),

        CONSTRAINT "fk_schedules_application_id"
          FOREIGN KEY ("application_id") REFERENCES "applications"("id") ON DELETE CASCADE,

        CONSTRAINT "chk_schedules_status"
          CHECK (status IN ('pending','confirmed','cancelled'))
      )
    `);

    await queryRunner.query(
      `CREATE INDEX "idx_schedules_application_id" ON "schedules"("application_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "schedules" CASCADE`);
  }
}
