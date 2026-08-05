import { ArrayMaxSize, ArrayMinSize, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { ScheduleSlotDto } from './schedule-slot.dto';

export class ProposeSlotsDto {
  @ApiProperty({ type: [ScheduleSlotDto], minItems: 1, maxItems: 5 })
  @ValidateNested({ each: true })
  @Type(() => ScheduleSlotDto)
  @ArrayMinSize(1)
  @ArrayMaxSize(5)
  slots!: ScheduleSlotDto[];
}
