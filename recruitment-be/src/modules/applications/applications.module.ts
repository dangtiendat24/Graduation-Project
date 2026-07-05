import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { Application } from './application.entity'
import { Job } from '../jobs/job.entity'
import { StorageModule } from '../storage/storage.module'
import { ApplicationsService } from './applications.service'
import { ApplicationsController } from './applications.controller'

@Module({
  imports: [TypeOrmModule.forFeature([Application, Job]), StorageModule],
  controllers: [ApplicationsController],
  providers: [ApplicationsService],
})
export class ApplicationsModule {}
