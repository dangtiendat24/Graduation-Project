import { IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateNotificationPreferencesDto {
  @ApiProperty()
  @IsBoolean()
  newApplication: boolean;

  @ApiProperty()
  @IsBoolean()
  scheduleConfirmed: boolean;

  @ApiProperty()
  @IsBoolean()
  matchingComplete: boolean;
}
