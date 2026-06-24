import { OmitType, PartialType, ApiPropertyOptional } from '@nestjs/swagger'
import { IsEnum, IsOptional } from 'class-validator'
import { CreateJobDto } from './create-job.dto'

export class UpdateJobDto extends PartialType(OmitType(CreateJobDto, ['status'] as const)) {
  @ApiPropertyOptional({ enum: ['draft', 'active', 'closed'] })
  @IsOptional()
  @IsEnum(['draft', 'active', 'closed'], { message: 'Trạng thái không hợp lệ' })
  status?: 'draft' | 'active' | 'closed'
}
