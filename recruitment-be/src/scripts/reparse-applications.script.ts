import * as dotenv from 'dotenv';
dotenv.config();

import { Queue } from 'bullmq';
import { QUEUE_NAMES } from '@smart-recruitment/shared';
import AppDataSource from '../config/typeorm.config';
import { Application } from '../modules/applications/application.entity';

/**
 * Re-enqueue CV parsing cho các application đã từng được AI phân tích (isAnalyzed=true
 * hoặc parseStatus='error'), để họ chạy lại qua prompt mới nhất (VD: fix summary tiếng Việt).
 * Job chỉ được thêm vào queue — recruitment-be (start:dev hoặc production) phải đang chạy
 * để ApplicationCvParserProcessor xử lý, giống hệt luồng nộp CV bình thường.
 *
 * Usage:
 *   npm run reparse:cv           # chỉ các application đã parse xong hoặc lỗi
 *   npm run reparse:cv -- --all  # mọi application có cvUrl, kể cả pending/processing
 */
async function main(): Promise<void> {
  const includeAll = process.argv.includes('--all');

  const redisConnection = buildRedisConnection();
  const queue = new Queue(QUEUE_NAMES.APPLICATION_CV_PARSE, {
    connection: redisConnection,
  });

  await AppDataSource.initialize();

  try {
    const repo = AppDataSource.getRepository(Application);
    const qb = repo.createQueryBuilder('app').where('app.cvUrl IS NOT NULL');

    if (!includeAll) {
      qb.andWhere('(app.isAnalyzed = true OR app.parseStatus = :err)', {
        err: 'error',
      });
    }

    const applications = await qb.getMany();

    if (applications.length === 0) {
      console.log('[reparse] Không có application nào cần re-parse.');
      return;
    }

    console.log(
      `[reparse] Tìm thấy ${applications.length} application cần re-parse...`,
    );

    for (const app of applications) {
      await queue.add(
        'parse',
        { applicationId: app.id },
        { attempts: 3, backoff: { type: 'exponential', delay: 2000 } },
      );
      console.log(`[reparse] Đã enqueue application ${app.id}`);
    }

    console.log(
      `[reparse] Hoàn tất: đã enqueue ${applications.length} job. ` +
        'Đảm bảo recruitment-be (start:dev hoặc production) đang chạy để xử lý.',
    );
  } finally {
    await queue.close();
    await AppDataSource.destroy();
  }
}

function buildRedisConnection() {
  const redisUrl = process.env.REDIS_URL;
  if (redisUrl) {
    const parsed = new URL(redisUrl);
    return {
      host: parsed.hostname,
      port: Number(parsed.port) || 6379,
      username: parsed.username || undefined,
      password: parsed.password || undefined,
      tls: parsed.protocol === 'rediss:' ? {} : undefined,
    };
  }

  return {
    host: process.env.REDIS_HOST || 'localhost',
    port: Number(process.env.REDIS_PORT) || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
  };
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('[reparse] Thất bại:', err);
    process.exit(1);
  });
