import 'multer'
import {
  Body,
  Controller,
  FileTypeValidator,
  ForbiddenException,
  MaxFileSizeValidator,
  ParseFilePipe,
  Post,
  Request,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { ApplicationsService } from './applications.service'
import { CreateApplicationDto } from './dto/create-application.dto'

interface JwtUser {
  id: string
  email: string
  role: string
}

const MAX_CV_SIZE = 5 * 1024 * 1024
const ALLOWED_CV_MIME_TYPES = /^(application\/pdf|application\/vnd\.openxmlformats-officedocument\.wordprocessingml\.document)$/

@ApiTags('applications')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('applications')
export class ApplicationsController {
  constructor(private readonly applicationsService: ApplicationsService) {}

  @ApiOperation({ summary: 'Ứng tuyển vào tin tuyển dụng (nộp CV, PDF hoặc DOCX, tối đa 5 MB)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        jobId: { type: 'string', format: 'uuid' },
        file: { type: 'string', format: 'binary' },
      },
    },
  })
  @Post()
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_CV_SIZE } }))
  apply(
    @Request() req: { user: JwtUser },
    @Body() dto: CreateApplicationDto,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: MAX_CV_SIZE }),
          new FileTypeValidator({ fileType: ALLOWED_CV_MIME_TYPES }),
        ],
      }),
    )
    file: Express.Multer.File,
  ) {
    this.assertCandidate(req.user)
    return this.applicationsService.apply(req.user.id, dto, file)
  }

  private assertCandidate(user: JwtUser): void {
    if (user.role !== 'candidate') {
      throw new ForbiddenException('Chỉ Candidate mới có thể ứng tuyển')
    }
  }
}
