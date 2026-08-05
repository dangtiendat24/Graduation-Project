import { Type } from 'class-transformer';
import { IsDateString, IsInt, IsOptional, Max, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SuggestSlotsQueryDto {
  @ApiProperty({
    description: 'Ngày bắt đầu tìm slot trống (YYYY-MM-DD)',
    example: '2026-08-10',
  })
  @IsDateString()
  startDate!: string;

  @ApiProperty({
    description: 'Ngày kết thúc tìm slot trống (YYYY-MM-DD)',
    example: '2026-08-14',
  })
  @IsDateString()
  endDate!: string;

  @ApiPropertyOptional({ default: 45, description: 'Độ dài mỗi slot (phút)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(15)
  @Max(240)
  durationMinutes?: number;
}
