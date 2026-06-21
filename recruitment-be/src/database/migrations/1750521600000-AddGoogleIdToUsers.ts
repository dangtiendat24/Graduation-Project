import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddGoogleIdToUsers1750521600000 implements MigrationInterface {
  name = 'AddGoogleIdToUsers1750521600000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN "google_id" varchar UNIQUE`,
    )
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "google_id"`)
  }
}
