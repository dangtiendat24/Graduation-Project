import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddProposedSlotsToSchedules1783267200000
  implements MigrationInterface
{
  name = 'AddProposedSlotsToSchedules1783267200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "schedules"
      ADD COLUMN "proposed_slots" JSONB
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "schedules"
      DROP COLUMN "proposed_slots"
    `);
  }
}
