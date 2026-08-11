import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPasswordResetToUsers1783785600000 implements MigrationInterface {
  name = 'AddPasswordResetToUsers1783785600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
        ADD COLUMN "password_reset_token" VARCHAR NULL,
        ADD COLUMN "password_reset_expires" TIMESTAMPTZ NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "users"
        ADD CONSTRAINT "UQ_users_password_reset_token" UNIQUE ("password_reset_token")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
        DROP CONSTRAINT "UQ_users_password_reset_token"
    `);
    await queryRunner.query(`
      ALTER TABLE "users"
        DROP COLUMN "password_reset_token",
        DROP COLUMN "password_reset_expires"
    `);
  }
}
