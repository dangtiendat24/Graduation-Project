import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateApplicationStatusHistory1782489600000 implements MigrationInterface {
  name = 'CreateApplicationStatusHistory1782489600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "application_status_history" (
        "id"             UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
        "application_id" UUID          NOT NULL,
        "from_status"    VARCHAR(20),
        "to_status"      VARCHAR(20)   NOT NULL,
        "changed_at"     TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
        "changed_by"     UUID,
        "metadata"       JSONB,

        CONSTRAINT "fk_application_status_history_application_id"
          FOREIGN KEY ("application_id") REFERENCES "applications"("id") ON DELETE CASCADE,

        CONSTRAINT "fk_application_status_history_changed_by"
          FOREIGN KEY ("changed_by") REFERENCES "users"("id") ON DELETE SET NULL,

        CONSTRAINT "chk_application_status_history_to_status"
          CHECK (to_status IN ('pending','matched','interviewed','schedule_sent','scheduled','completed','hired','rejected')),

        CONSTRAINT "chk_application_status_history_from_status"
          CHECK (from_status IS NULL OR from_status IN ('pending','matched','interviewed','schedule_sent','scheduled','completed','hired','rejected'))
      )
    `);

    await queryRunner.query(
      `CREATE INDEX "idx_application_status_history_application_id" ON "application_status_history"("application_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP TABLE IF EXISTS "application_status_history" CASCADE`,
    );
  }
}
