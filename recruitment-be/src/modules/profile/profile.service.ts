import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import * as path from 'path'
import 'multer'
import { User } from '../users/user.entity'
import { CandidateResume } from './entities/candidate-resume.entity'
import { StorageService } from '../storage/storage.service'
import { ResumeParserService } from '../resume-parser/resume-parser.service'
import { UpdateProfileDto } from './dto/update-profile.dto'

export interface ProfileResponse {
  id: string
  email: string
  fullName: string
  phone: string | null
  city: string | null
  linkedin: string | null
  github: string | null
  avatarUrl: string | null
  role: string
  resume: CandidateResume | null
}

@Injectable()
export class ProfileService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(CandidateResume)
    private readonly resumeRepo: Repository<CandidateResume>,
    private readonly storage: StorageService,
    private readonly resumeParser: ResumeParserService,
  ) {}

  async getMyProfile(userId: string): Promise<ProfileResponse> {
    const user = await this.userRepo.findOne({ where: { id: userId } })
    if (!user) throw new NotFoundException('Không tìm thấy người dùng')

    const resume = await this.resumeRepo.findOne({ where: { candidateId: userId } })
    return this.toResponse(user, resume)
  }

  async updateProfile(userId: string, dto: UpdateProfileDto): Promise<ProfileResponse> {
    const user = await this.userRepo.findOne({ where: { id: userId } })
    if (!user) throw new NotFoundException('Không tìm thấy người dùng')

    Object.assign(user, dto)
    await this.userRepo.save(user)

    const resume = await this.resumeRepo.findOne({ where: { candidateId: userId } })
    return this.toResponse(user, resume)
  }

  async uploadCV(
    userId: string,
    file: Express.Multer.File,
  ): Promise<CandidateResume> {
    const ext = path.extname(file.originalname)
    const key = `resumes/${userId}/${Date.now()}${ext}`
    const url = await this.storage.upload(key, file.buffer, file.mimetype)

    let resume = await this.resumeRepo.findOne({ where: { candidateId: userId } })

    if (resume) {
      // Delete old file from S3 silently
      await this.storage.delete(resume.cvFileName)
      resume.cvFileName = key
      resume.cvOriginalName = file.originalname
      resume.cvUrl = url
      resume.cvSizeBytes = file.size
      resume.isAnalyzed = false
      resume.parseStatus = 'pending'
      resume.parsedAt = null
      resume.parsedSummary = null
      resume.parsedSkills = null
      resume.parsedExperience = null
      resume.parsedEducation = null
    } else {
      resume = this.resumeRepo.create({
        candidateId: userId,
        cvFileName: key,
        cvOriginalName: file.originalname,
        cvUrl: url,
        cvSizeBytes: file.size,
      })
    }

    const saved = await this.resumeRepo.save(resume)
    await this.resumeParser.enqueueParse(saved.id)
    return saved
  }

  private toResponse(user: User, resume: CandidateResume | null): ProfileResponse {
    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      phone: user.phone,
      city: user.city,
      linkedin: user.linkedin,
      github: user.github,
      avatarUrl: user.avatarUrl,
      role: user.role,
      resume,
    }
  }
}
