import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AgentExecutionLog } from './agent-execution-log.entity';
import { AgentExecutionLoggerService } from './agent-execution-logger.service';
import { AdminAgentStatsService } from './admin-agent-stats.service';
import { AdminController } from './admin.controller';

@Module({
  imports: [TypeOrmModule.forFeature([AgentExecutionLog])],
  controllers: [AdminController],
  providers: [AgentExecutionLoggerService, AdminAgentStatsService],
  exports: [AgentExecutionLoggerService],
})
export class AdminModule {}
