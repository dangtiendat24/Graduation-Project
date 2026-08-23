import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Thêm 'interview_scored' vào danh sách type hợp lệ của notifications — dùng khi Agent 3 chấm
 * điểm xong bài phỏng vấn AI của ứng viên, báo cho recruiter biết (trước đây sự kiện này không
 * có thông báo nào cả, chỉ chuyển trạng thái application ngầm).
 */
export class AddInterviewScoredToNotificationType1786924800000
  implements MigrationInterface
{
  name = 'AddInterviewScoredToNotificationType1786924800000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "notifications" DROP CONSTRAINT IF EXISTS "chk_notifications_type"
    `);
    await queryRunner.query(`
      ALTER TABLE "notifications"
        ADD CONSTRAINT "chk_notifications_type"
          CHECK (type IN ('new_application','matching_complete','interview_scored','schedule_proposed','schedule_confirmed','interview_invite','application_rejected','application_hired'))
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "notifications" DROP CONSTRAINT IF EXISTS "chk_notifications_type"
    `);
    await queryRunner.query(`
      ALTER TABLE "notifications"
        ADD CONSTRAINT "chk_notifications_type"
          CHECK (type IN ('new_application','matching_complete','schedule_proposed','schedule_confirmed','interview_invite','application_rejected','application_hired'))
    `);
  }
}
