import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { User } from '../users/user.entity'
import { CandidateResume } from './entities/candidate-resume.entity'
import { StorageModule } from '../storage/storage.module'
import { ResumeParserModule } from '../resume-parser/resume-parser.module'
import { ProfileService } from './profile.service'
import { ProfileController } from './profile.controller'

@Module({
  imports: [
    TypeOrmModule.forFeature([User, CandidateResume]),
    StorageModule,
    ResumeParserModule,
  ],
  providers: [ProfileService],
  controllers: [ProfileController],
})
export class ProfileModule {}
