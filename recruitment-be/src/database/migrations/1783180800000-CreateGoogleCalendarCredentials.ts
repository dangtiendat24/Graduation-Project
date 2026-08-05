import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateGoogleCalendarCredentials1783180800000
  implements MigrationInterface
{
  name = 'CreateGoogleCalendarCredentials1783180800000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "google_calendar_credentials" (
        "id"            UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
        "user_id"       UUID          NOT NULL,
        "access_token"  TEXT          NOT NULL,
        "refresh_token" TEXT          NOT NULL,
        "expiry_date"   TIMESTAMPTZ   NOT NULL,
        "scope"         VARCHAR(500)  NOT NULL,
        "created_at"    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
        "updated_at"    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

        CONSTRAINT "uq_google_calendar_credentials_user_id" UNIQUE ("user_id"),

        CONSTRAINT "fk_google_calendar_credentials_user_id"
          FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP TABLE IF EXISTS "google_calendar_credentials" CASCADE`,
    );
  }
}
