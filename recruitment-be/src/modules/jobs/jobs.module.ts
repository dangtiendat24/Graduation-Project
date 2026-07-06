import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { HttpModule } from '@nestjs/axios'
import { Job } from './job.entity'
import { Company } from '../companies/company.entity'
import { JobsController } from './jobs.controller'
import { JobsService } from './jobs.service'

@Module({
  imports: [TypeOrmModule.forFeature([Job, Company]), HttpModule],
  controllers: [JobsController],
  providers: [JobsService],
  exports: [JobsService],
})
export class JobsModule {}
