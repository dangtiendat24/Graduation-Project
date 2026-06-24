import { ApiPropertyOptional } from '@nestjs/swagger'
import { IsOptional, IsString, MaxLength } from 'class-validator'

export class UpdateProfileDto {
  @ApiPropertyOptional({ description: 'Họ và tên', maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  fullName?: string

  @ApiPropertyOptional({ description: 'Số điện thoại', maxLength: 20 })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string

  @ApiPropertyOptional({ description: 'Thành phố', maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string

  @ApiPropertyOptional({ description: 'URL LinkedIn', maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  linkedin?: string

  @ApiPropertyOptional({ description: 'URL GitHub / Portfolio', maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  github?: string
}
