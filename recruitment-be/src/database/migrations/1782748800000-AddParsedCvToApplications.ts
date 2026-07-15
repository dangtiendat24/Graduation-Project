import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddParsedCvToApplications1782748800000 implements MigrationInterface {
  name = 'AddParsedCvToApplications1782748800000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "applications"
        ADD COLUMN "parsed_summary"    TEXT        NULL,
        ADD COLUMN "parsed_skills"     JSONB       NULL,
        ADD COLUMN "parsed_experience" JSONB       NULL,
        ADD COLUMN "parsed_education"  JSONB       NULL,
        ADD COLUMN "is_analyzed"       BOOLEAN     NOT NULL DEFAULT false,
        ADD COLUMN "parse_status"      VARCHAR(20) NOT NULL DEFAULT 'pending',
        ADD COLUMN "parsed_at"         TIMESTAMPTZ NULL
    `)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "applications"
        DROP COLUMN "parsed_summary",
        DROP COLUMN "parsed_skills",
        DROP COLUMN "parsed_experience",
        DROP COLUMN "parsed_education",
        DROP COLUMN "is_analyzed",
        DROP COLUMN "parse_status",
        DROP COLUMN "parsed_at"
    `)
  }
}
