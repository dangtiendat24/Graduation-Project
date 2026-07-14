import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { Application } from '../applications/application.entity'
import { StorageModule } from '../storage/storage.module'
import { CandidatesService } from './candidates.service'
import { CandidatesController } from './candidates.controller'

@Module({
  imports: [TypeOrmModule.forFeature([Application]), StorageModule],
  controllers: [CandidatesController],
  providers: [CandidatesService],
})
export class CandidatesModule {}
