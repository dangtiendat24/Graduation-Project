import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateNotifications1786838400000 implements MigrationInterface {
  name = 'CreateNotifications1786838400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "notifications" (
        "id"         UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
        "user_id"    UUID          NOT NULL,
        "type"       VARCHAR(30)   NOT NULL,
        "title"      VARCHAR(200)  NOT NULL,
        "message"    TEXT          NOT NULL,
        "link"       VARCHAR(300),
        "metadata"   JSONB,
        "is_read"    BOOLEAN       NOT NULL DEFAULT FALSE,
        "created_at" TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

        CONSTRAINT "fk_notifications_user_id"
          FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE,

        CONSTRAINT "chk_notifications_type"
          CHECK (type IN ('new_application','matching_complete','schedule_proposed','schedule_confirmed','interview_invite','application_rejected','application_hired'))
      )
    `);

    await queryRunner.query(
      `CREATE INDEX "idx_notifications_user_id_created_at" ON "notifications"("user_id", "created_at")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "notifications" CASCADE`);
  }
}
