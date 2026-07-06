import { IsUUID } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

export class CreateApplicationDto {
  @ApiProperty({ description: 'ID tin tuyển dụng muốn ứng tuyển' })
  @IsUUID()
  jobId!: string
}
