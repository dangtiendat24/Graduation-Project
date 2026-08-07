import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsUUID } from 'class-validator';

export class GetReportsOverviewQueryDto {
  @ApiPropertyOptional({ description: 'Lọc theo 1 tin tuyển dụng cụ thể' })
  @IsOptional()
  @IsUUID()
  jobId?: string;

  @ApiPropertyOptional({ description: 'Chỉ tính đơn ứng tuyển nộp từ ngày này (ISO date)' })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({ description: 'Chỉ tính đơn ứng tuyển nộp đến ngày này (ISO date)' })
  @IsOptional()
  @IsDateString()
  to?: string;
}
