import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAvatarStorageKeyToUsers1783612800000 implements MigrationInterface {
  name = 'AddAvatarStorageKeyToUsers1783612800000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
        ADD COLUMN "avatar_storage_key" VARCHAR(500) NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
        DROP COLUMN "avatar_storage_key"
    `);
  }
}
