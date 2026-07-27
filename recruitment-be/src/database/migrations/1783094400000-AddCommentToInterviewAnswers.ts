import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCommentToInterviewAnswers1783094400000
  implements MigrationInterface
{
  name = 'AddCommentToInterviewAnswers1783094400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "interview_answers"
        ADD COLUMN "comment" TEXT
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "interview_answers"
        DROP COLUMN "comment"
    `);
  }
}
