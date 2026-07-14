import {
  IsString,
  IsOptional,
  IsEnum,
  IsInt,
  IsArray,
  MaxLength,
  Min,
  IsNotEmpty,
  IsDateString,
} from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

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
}
