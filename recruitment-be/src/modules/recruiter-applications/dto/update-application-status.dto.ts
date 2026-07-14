import { IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { APPLICATION_STATUSES } from '@smart-recruitment/shared';
import type { ApplicationStatus } from '@smart-recruitment/shared';

export class UpdateApplicationStatusDto {
  @ApiProperty({
    enum: APPLICATION_STATUSES,
    description:
      'Trạng thái mới. Chuyển sang "interviewed" (mời phỏng vấn) hoặc "rejected" (từ chối) sẽ tự động gửi email thông báo cho ứng viên. Chỉ chấp nhận nếu hợp lệ theo state machine (VALID_TRANSITIONS).',
  })
  @IsIn(APPLICATION_STATUSES)
  status!: ApplicationStatus;
}
