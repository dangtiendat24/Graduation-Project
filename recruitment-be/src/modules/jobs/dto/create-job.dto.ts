import {
  IsString,
  IsOptional,
  IsEnum,
  IsInt,
  IsArray,
  IsNumber,
  MaxLength,
  Min,
  Max,
  IsNotEmpty,
  IsDateString,
  ValidateNested,
} from 'class-validator'
import { Type } from 'class-transformer'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

/** Trọng số chấm điểm riêng cho vị trí (P4) — 3 số 0-1, tổng phải = 1 (kiểm tra ở JobsService). */
export class ScoringWeightsDto {
  @ApiProperty({ example: 0.5 })
  @IsNumber()
  @Min(0)
  @Max(1)
  skills: number

  @ApiProperty({ example: 0.3 })
  @IsNumber()
  @Min(0)
  @Max(1)
  experience: number

  @ApiProperty({ example: 0.2 })
  @IsNumber()
  @Min(0)
  @Max(1)
  education: number
}

export class CreateJobDto {
  @ApiProperty({ example: 'Senior Frontend Developer' })
  @IsString()
  @IsNotEmpty({ message: 'Tên vị trí không được để trống' })
  @MaxLength(255)
  title: string

  @ApiProperty({ example: 'Mô tả công việc chi tiết...' })
  @IsString()
  @IsNotEmpty({ message: 'Mô tả công việc không được để trống' })
  description: string

  @ApiProperty({ example: 'Yêu cầu ứng viên có kinh nghiệm...' })
  @IsString()
  @IsNotEmpty({ message: 'Yêu cầu ứng viên không được để trống' })
  requirements: string

  @ApiPropertyOptional({ example: 'Kỹ thuật' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  department?: string

  @ApiPropertyOptional({ enum: ['intern', 'junior', 'middle', 'senior', 'lead', 'director'] })
  @IsOptional()
  @IsEnum(['intern', 'junior', 'middle', 'senior', 'lead', 'director'], {
    message: 'Cấp độ không hợp lệ',
  })
  level?: 'intern' | 'junior' | 'middle' | 'senior' | 'lead' | 'director'

  @ApiPropertyOptional({ example: 'Hà Nội' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  location?: string

  @ApiPropertyOptional({ example: 3, default: 1 })
  @IsOptional()
  @IsInt({ message: 'Số lượng tuyển phải là số nguyên' })
  @Min(1)
  headcount?: number

  @ApiPropertyOptional({ enum: ['onsite', 'hybrid', 'remote'] })
  @IsOptional()
  @IsEnum(['onsite', 'hybrid', 'remote'], { message: 'Mô hình làm việc không hợp lệ' })
  workModel?: 'onsite' | 'hybrid' | 'remote'

  @ApiPropertyOptional({ type: [String], example: ['React', 'TypeScript', 'Node.js'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  requiredSkills?: string[]

  @ApiPropertyOptional({ example: '2' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  minExperience?: string

  @ApiPropertyOptional({ example: '25-40 triệu' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  salaryRange?: string

  @ApiPropertyOptional({ type: [String], example: ['13 tháng lương', 'Bảo hiểm sức khỏe'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  jobPerks?: string[]

  @ApiPropertyOptional({ enum: ['draft', 'active'], default: 'draft' })
  @IsOptional()
  @IsEnum(['draft', 'active'], { message: 'Trạng thái không hợp lệ (draft hoặc active)' })
  status?: 'draft' | 'active'

  @ApiPropertyOptional({ example: '2026-08-31' })
  @IsOptional()
  @IsDateString({}, { message: 'Hạn nộp hồ sơ phải đúng định dạng YYYY-MM-DD' })
  deadline?: string

  @ApiPropertyOptional({
    type: ScoringWeightsDto,
    nullable: true,
    description:
      'Ghi đè trọng số matching mặc định cho riêng vị trí này (tổng 3 giá trị phải = 1). ' +
      'Gửi null để xoá override và quay về MATCHING_WEIGHTS mặc định.',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => ScoringWeightsDto)
  scoringWeights?: ScoringWeightsDto | null
}
