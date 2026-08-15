import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Các cột chỉ voice interview ghi — audio_url (key lưu trên Storage) và các tín hiệu khách quan
 * hỗ trợ chấm tiêu chí "authenticity" (rời tab, độ trễ trả lời). Text interview không ghi các
 * cột này, luôn NULL cho answer thuộc session mode='text'.
 */
export class AddVoiceFieldsToInterviewAnswers1786752000000 implements MigrationInterface {
  name = 'AddVoiceFieldsToInterviewAnswers1786752000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "interview_answers"
        ADD COLUMN "audio_url" TEXT,
        ADD COLUMN "response_latency_ms" INTEGER,
        ADD COLUMN "tab_blur_count" INTEGER,
        ADD COLUMN "tab_blur_total_ms" INTEGER
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "interview_answers"
        DROP COLUMN "audio_url",
        DROP COLUMN "response_latency_ms",
        DROP COLUMN "tab_blur_count",
        DROP COLUMN "tab_blur_total_ms"
    `);
  }
}
