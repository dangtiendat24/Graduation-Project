import { OmitType, PartialType, ApiPropertyOptional } from '@nestjs/swagger'
import { IsEnum, IsOptional } from 'class-validator'
import { CreateJobDto } from './create-job.dto'

export class UpdateJobDto extends PartialType(OmitType(CreateJobDto, ['status'] as const)) {
  /**
   * Nhận cả 'expired' để form sửa tin gửi lại đúng trạng thái hiện tại của tin quá hạn, nhưng
   * đây không phải trạng thái recruiter tự đặt: JobsService.update luôn chuẩn hoá 'expired' và
   * 'active' lại theo deadline.
   */
  @ApiPropertyOptional({ enum: ['draft', 'active', 'closed', 'expired'] })
  @IsOptional()
  @IsEnum(['draft', 'active', 'closed', 'expired'], { message: 'Trạng thái không hợp lệ' })
  status?: 'draft' | 'active' | 'closed' | 'expired'
}
