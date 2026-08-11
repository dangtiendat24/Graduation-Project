import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSettingsToUsers1783526400000 implements MigrationInterface {
  name = 'AddSettingsToUsers1783526400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
        ADD COLUMN "notification_preferences" JSONB NULL,
        ADD COLUMN "default_scoring_weights" JSONB NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
        DROP COLUMN "notification_preferences",
        DROP COLUMN "default_scoring_weights"
    `);
  }
}
