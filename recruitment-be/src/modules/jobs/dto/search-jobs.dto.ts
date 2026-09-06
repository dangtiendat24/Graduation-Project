import { IsBooleanString, IsEnum, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator'
import { ApiPropertyOptional } from '@nestjs/swagger'

export class SearchJobsDto {
  @ApiPropertyOptional({ example: 'Node.js' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  q?: string

  @ApiPropertyOptional({ example: 'Hà Nội' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  location?: string

  @ApiPropertyOptional({ enum: ['onsite', 'hybrid', 'remote'] })
  @IsOptional()
  @IsEnum(['onsite', 'hybrid', 'remote'])
  workModel?: 'onsite' | 'hybrid' | 'remote'

  @ApiPropertyOptional({ enum: ['intern', 'junior', 'middle', 'senior', 'lead', 'director'] })
  @IsOptional()
  @IsEnum(['intern', 'junior', 'middle', 'senior', 'lead', 'director'])
  level?: 'intern' | 'junior' | 'middle' | 'senior' | 'lead' | 'director'

  @ApiPropertyOptional({ example: 'uuid-of-company' })
  @IsOptional()
  @IsUUID()
  companyId?: string

  /**
   * Mặc định chỉ trả tin 'active'. Trang công ty phía ứng viên bật cờ này để xem thêm tin đã
   * quá hạn ('expired') — tin 'closed' (recruiter chủ động đóng) thì không bao giờ trả ra đây.
   * Là query param nên nhận chuỗi 'true'/'false'.
   */
  @ApiPropertyOptional({ example: 'true', description: 'Trả thêm tin đã quá hạn (expired)' })
  @IsOptional()
  @IsBooleanString()
  includeExpired?: string
}
