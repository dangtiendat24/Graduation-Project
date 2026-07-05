import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { BullModule } from '@nestjs/bullmq'
import { HttpModule } from '@nestjs/axios'
import { QUEUE_NAMES } from '@smart-recruitment/shared'
import { CandidateResume } from '../profile/entities/candidate-resume.entity'
import { StorageModule } from '../storage/storage.module'
import { ResumeParserService } from './resume-parser.service'
import { ResumeParserProcessor } from './resume-parser.processor'

@Module({
  imports: [
    TypeOrmModule.forFeature([CandidateResume]),
    BullModule.registerQueue({ name: QUEUE_NAMES.RESUME_PARSE }),
    HttpModule,
    StorageModule,
  ],
  providers: [ResumeParserService, ResumeParserProcessor],
  exports: [ResumeParserService],
})
export class ResumeParserModule {}
