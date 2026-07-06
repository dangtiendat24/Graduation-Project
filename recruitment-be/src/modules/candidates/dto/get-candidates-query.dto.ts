import { Type } from 'class-transformer'
import { IsIn, IsInt, IsOptional, IsString, IsUUID, Max, MaxLength, Min } from 'class-validator'
import { ApiPropertyOptional } from '@nestjs/swagger'
import type { ApplicationStatus } from '../../applications/application.entity'

const APPLICATION_STATUSES: ApplicationStatus[] = [
  'pending',
  'matched',
  'interviewed',
  'schedule_sent',
  'scheduled',
  'completed',
  'hired',
  'rejected',
]

export class GetCandidatesQueryDto {
  @ApiPropertyOptional({ description: 'Lọc theo tin tuyển dụng cụ thể' })
  @IsOptional()
  @IsUUID()
  jobId?: string

  @ApiPropertyOptional({ enum: APPLICATION_STATUSES })
  @IsOptional()
  @IsIn(APPLICATION_STATUSES)
  status?: ApplicationStatus

  @ApiPropertyOptional({ description: 'Tìm theo tên hoặc email ứng viên' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  search?: string

  @ApiPropertyOptional({ enum: ['appliedAt', 'overallScore'], default: 'appliedAt' })
  @IsOptional()
  @IsIn(['appliedAt', 'overallScore'])
  sort?: 'appliedAt' | 'overallScore'

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number
}
