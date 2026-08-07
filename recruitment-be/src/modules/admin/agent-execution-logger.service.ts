import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AgentExecutionLog, AgentName } from './agent-execution-log.entity';

/**
 * Điểm ghi log tập trung duy nhất cho mọi lần thực thi Agent (gọi ai-service).
 * Mỗi call site chỉ cần bọc lệnh gọi ai-service hiện có trong track(...) — không thay đổi
 * hành vi/try-catch nghiệp vụ đã có, track() có try/catch riêng để luôn log cả khi lỗi
 * rồi throw lại đúng lỗi gốc.
 */
@Injectable()
export class AgentExecutionLoggerService {
  private readonly logger = new Logger(AgentExecutionLoggerService.name);

  constructor(
    @InjectRepository(AgentExecutionLog)
    private readonly logRepo: Repository<AgentExecutionLog>,
  ) {}

  async track<T>(
    agentName: AgentName,
    applicationId: string | null,
    fn: () => Promise<T>,
  ): Promise<T> {
    const startedAt = new Date();
    const startedAtMs = Date.now();
    try {
      const result = await fn();
      await this.persist(
        agentName,
        applicationId,
        startedAt,
        Date.now() - startedAtMs,
        true,
        null,
      );
      return result;
    } catch (err) {
      await this.persist(
        agentName,
        applicationId,
        startedAt,
        Date.now() - startedAtMs,
        false,
        (err as Error).message,
      );
      throw err;
    }
  }

  /** Ghi log không được làm hỏng luồng nghiệp vụ chính — lỗi ghi log chỉ log cảnh báo, không throw */
  private async persist(
    agentName: AgentName,
    applicationId: string | null,
    startedAt: Date,
    durationMs: number,
    success: boolean,
    errorMessage: string | null,
  ): Promise<void> {
    try {
      await this.logRepo.save(
        this.logRepo.create({
          agentName,
          applicationId,
          startedAt,
          durationMs,
          success,
          errorMessage,
        }),
      );
    } catch (err) {
      this.logger.warn(
        `Ghi agent execution log thất bại (agent=${agentName}): ${(err as Error).message}`,
      );
    }
  }
}
