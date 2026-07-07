import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import type { ApplicationStatus } from '../../applications/application.entity';

const APPLICATION_STATUSES: ApplicationStatus[] = [
  'pending',
  'matched',
  'interviewed',
  'schedule_sent',
  'scheduled',
  'completed',
  'hired',
  'rejected',
];

export class GetMyApplicationsQueryDto {
  @ApiPropertyOptional({
    enum: APPLICATION_STATUSES,
    description: 'Lọc theo trạng thái đơn ứng tuyển',
  })
  @IsOptional()
  @IsIn(APPLICATION_STATUSES)
  status?: ApplicationStatus;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}
