import { MigrationInterface, QueryRunner } from 'typeorm';

/** logo_url/cover_url là varchar(500) — signed URL (JWT token dài) vượt quá 500 ký tự, gây lỗi khi lưu. */
export class WidenCompanyImageUrlColumns1783699200000 implements MigrationInterface {
  name = 'WidenCompanyImageUrlColumns1783699200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "companies"
        ALTER COLUMN "logo_url" TYPE TEXT,
        ALTER COLUMN "cover_url" TYPE TEXT
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "companies"
        ALTER COLUMN "logo_url" TYPE VARCHAR(500),
        ALTER COLUMN "cover_url" TYPE VARCHAR(500)
    `);
  }
}
