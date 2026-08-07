import { MigrationInterface, QueryRunner } from 'typeorm';

/** Cache PDF báo cáo đã render theo applicationId — tránh Puppeteer render lại nếu MatchingResult chưa đổi (xem ReportsService.getReportPdfUrl) */
export class CreateReportCache1783353600000 implements MigrationInterface {
  name = 'CreateReportCache1783353600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "report_cache" (
        "application_id"     UUID          PRIMARY KEY,
        "storage_key"        VARCHAR(500)  NOT NULL,
        "source_updated_at"  TIMESTAMPTZ   NOT NULL,
        "created_at"         TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
        "updated_at"         TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

        CONSTRAINT "fk_report_cache_application_id"
          FOREIGN KEY ("application_id") REFERENCES "applications"("id") ON DELETE CASCADE
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "report_cache" CASCADE`);
  }
}
