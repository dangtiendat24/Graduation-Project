import { IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { ScoringWeightsDto } from '../../jobs/dto/create-job.dto';

export class UpdateScoringWeightsDto {
  /** null/undefined = xoá mặc định riêng, quay về MATCHING_WEIGHTS toàn cục */
  @ApiPropertyOptional({ type: ScoringWeightsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => ScoringWeightsDto)
  weights?: ScoringWeightsDto | null;
}
