import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddScoringWeightsToJobs1782835200000 implements MigrationInterface {
  name = 'AddScoringWeightsToJobs1782835200000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "jobs"
        ADD COLUMN "scoring_weights" JSONB NULL
    `)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "jobs"
        DROP COLUMN "scoring_weights"
    `)
  }
}
