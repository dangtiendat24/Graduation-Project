import { IsISO8601 } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ScheduleSlotDto {
  @ApiProperty({ example: '2026-08-04T09:00:00+07:00' })
  @IsISO8601()
  start!: string;

  @ApiProperty({ example: '2026-08-04T09:45:00+07:00' })
  @IsISO8601()
  end!: string;
}
