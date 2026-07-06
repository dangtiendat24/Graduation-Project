import { Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { InjectRepository } from '@nestjs/typeorm'
import { Processor, WorkerHost } from '@nestjs/bullmq'
import { HttpService } from '@nestjs/axios'
import { Repository } from 'typeorm'
import { Job } from 'bullmq'
import { firstValueFrom } from 'rxjs'
import { QUEUE_NAMES, ParsedCvSchema } from '@smart-recruitment/shared'
import { CandidateResume } from '../profile/entities/candidate-resume.entity'
import { StorageService } from '../storage/storage.service'
import { extractCvText } from './utils/cv-text-extractor.util'
import { ResumeParseJobData } from './resume-parser.service'

interface AiParseResumeResponse {
  profile_id: string
  parsed_data: Record<string, unknown>
  success: boolean
  error: string | null
}

@Processor(QUEUE_NAMES.RESUME_PARSE)
export class ResumeParserProcessor extends WorkerHost {
  private readonly logger = new Logger(ResumeParserProcessor.name)

  constructor(
    @InjectRepository(CandidateResume)
    private readonly resumeRepo: Repository<CandidateResume>,
    private readonly storage: StorageService,
    private readonly httpService: HttpService,
    private readonly config: ConfigService,
  ) {
    super()
  }

  async process(job: Job<ResumeParseJobData>): Promise<void> {
    const resume = await this.resumeRepo.findOne({ where: { id: job.data.resumeId } })
    if (!resume) return

    resume.parseStatus = 'processing'
    await this.resumeRepo.save(resume)

    try {
      const buffer = await this.storage.download(resume.cvFileName)
      const cvRawText = await extractCvText(buffer, resume.cvOriginalName)

      const aiServiceUrl = this.config.get<string>('AI_SERVICE_URL', 'http://localhost:8000')
      const { data } = await firstValueFrom(
        this.httpService.post<AiParseResumeResponse>(
          `${aiServiceUrl}/api/ai/resume-parser/parse`,
          { profile_id: resume.candidateId, cv_raw_text: cvRawText },
        ),
      )

      if (!data.success) {
        throw new Error(data.error ?? 'AI service trả về lỗi không xác định')
      }

      const parsed = ParsedCvSchema.parse(data.parsed_data)

      resume.parsedSummary = parsed.summary
      resume.parsedSkills = parsed.skills
      resume.parsedExperience = parsed.experience
      resume.parsedEducation = parsed.education
      resume.isAnalyzed = true
      resume.parseStatus = 'done'
      resume.parsedAt = new Date()
      await this.resumeRepo.save(resume)

      await this.embedCv(aiServiceUrl, resume.candidateId, cvRawText)
    } catch (err) {
      resume.isAnalyzed = false
      resume.parseStatus = 'error'
      await this.resumeRepo.save(resume)
      this.logger.error(`Parse CV thất bại cho resume ${resume.id}: ${(err as Error).message}`)
      throw err
    }
  }

  private async embedCv(aiServiceUrl: string, profileId: string, cvText: string): Promise<void> {
    try {
      await firstValueFrom(
        this.httpService.post(`${aiServiceUrl}/api/ai/matching/embeddings/cv`, {
          profile_id: profileId,
          cv_text: cvText,
        }),
      )
    } catch (err) {
      this.logger.warn(`Lưu embedding CV thất bại cho profile ${profileId}: ${(err as Error).message}`)
    }
  }
}
