import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export const APPLICATION_SORT_FIELDS = ['score', 'date'] as const;
export type ApplicationSortField = (typeof APPLICATION_SORT_FIELDS)[number];

/** Cao (>=80), Trung bình (60-79), Thấp (<60) — theo overall_score của MatchingResult */
export const SCORE_BANDS = ['high', 'medium', 'low'] as const;
export type ScoreBand = (typeof SCORE_BANDS)[number];

export class GetJobApplicationsQueryDto {
  @ApiPropertyOptional({
    enum: APPLICATION_SORT_FIELDS,
    default: 'score',
    description:
      'Sắp xếp theo điểm phù hợp (giảm dần) hoặc ngày nộp đơn (mới nhất trước)',
  })
  @IsOptional()
  @IsIn(APPLICATION_SORT_FIELDS)
  sort?: ApplicationSortField;

  @ApiPropertyOptional({
    enum: SCORE_BANDS,
    description: 'Lọc theo nhóm điểm: high (>=80), medium (60-79), low (<60)',
  })
  @IsOptional()
  @IsIn(SCORE_BANDS)
  scoreBand?: ScoreBand;

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
