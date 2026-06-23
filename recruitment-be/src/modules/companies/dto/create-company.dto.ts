import {
  IsString,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsInt,
  IsArray,
  MaxLength,
  Min,
  Max,
  IsNotEmpty,
} from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class CreateCompanyDto {
  @ApiProperty({ example: 'TechVision Vietnam' })
  @IsString()
  @IsNotEmpty({ message: 'Tên công ty không được để trống' })
  @MaxLength(255)
  name: string

  @ApiPropertyOptional({ example: 'TechVision' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  shortName?: string

  @ApiPropertyOptional({ example: 'Kiến tạo tương lai số cùng công nghệ AI' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  tagline?: string

  @ApiPropertyOptional({ description: 'S3 key của file logo' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  logoUrl?: string

  @ApiPropertyOptional({ description: 'S3 key của ảnh bìa' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  coverUrl?: string

  @ApiPropertyOptional({ example: 'Công nghệ thông tin' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  industry?: string

  @ApiPropertyOptional({ enum: ['startup', 'tnhh', 'co_phan', 'fdi', 'tap_doan'] })
  @IsOptional()
  @IsEnum(['startup', 'tnhh', 'co_phan', 'fdi', 'tap_doan'], {
    message: 'Loại hình công ty không hợp lệ',
  })
  companyType?: 'startup' | 'tnhh' | 'co_phan' | 'fdi' | 'tap_doan'

  @ApiPropertyOptional({ enum: ['1-10', '11-50', '51-200', '201-500', '501-1000', '1000+'] })
  @IsOptional()
  @IsEnum(['1-10', '11-50', '51-200', '201-500', '501-1000', '1000+'], {
    message: 'Quy mô nhân sự không hợp lệ',
  })
  sizeRange?: '1-10' | '11-50' | '51-200' | '201-500' | '501-1000' | '1000+'

  @ApiPropertyOptional({ example: 2018 })
  @IsOptional()
  @IsInt({ message: 'Năm thành lập phải là số nguyên' })
  @Min(1900)
  @Max(2100)
  foundedYear?: number

  @ApiPropertyOptional({ maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'Mô tả ngắn tối đa 500 ký tự' })
  shortDesc?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  fullDesc?: string

  @ApiPropertyOptional({ enum: ['onsite', 'hybrid', 'remote'] })
  @IsOptional()
  @IsEnum(['onsite', 'hybrid', 'remote'], { message: 'Mô hình làm việc không hợp lệ' })
  workModel?: 'onsite' | 'hybrid' | 'remote'

  @ApiPropertyOptional({ example: 'Tiếng Việt + Tiếng Anh' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  workLanguage?: string

  @ApiPropertyOptional({ type: [String], example: ['React', 'Node.js', 'AWS'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  techStack?: string[]

  @ApiPropertyOptional({ type: [String], example: ['13 tháng lương', 'Remote linh hoạt'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  perks?: string[]

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  address?: string

  @ApiPropertyOptional({ example: 'Hà Nội' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string

  @ApiPropertyOptional({ example: 'https://techvision.vn' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  website?: string

  @ApiPropertyOptional({ example: 'https://linkedin.com/company/techvision-vn' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  linkedinUrl?: string

  @ApiPropertyOptional({ example: 'https://facebook.com/techvisionvn' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  facebookUrl?: string

  @ApiPropertyOptional({ description: 'true = công khai với ứng viên' })
  @IsOptional()
  @IsBoolean()
  isPublished?: boolean
}
