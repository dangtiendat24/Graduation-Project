import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification, NotificationType } from './notification.entity';

export interface NotificationListResult {
  items: Notification[];
  total: number;
  unreadCount: number;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectRepository(Notification)
    private readonly repo: Repository<Notification>,
  ) {}

  /** Không để lỗi ghi thông báo làm hỏng luồng nghiệp vụ chính gọi nó — chỉ log lại nếu thất bại */
  async create(
    userId: string,
    type: NotificationType,
    title: string,
    message: string,
    link: string | null = null,
    metadata: Record<string, unknown> | null = null,
  ): Promise<void> {
    try {
      await this.repo.save(
        this.repo.create({ userId, type, title, message, link, metadata }),
      );
    } catch (err) {
      this.logger.error(
        `Ghi thông báo trong-app thất bại (type=${type}, userId=${userId}): ${(err as Error).message}`,
      );
    }
  }

  async findForUser(
    userId: string,
    page: number,
    limit: number,
  ): Promise<NotificationListResult> {
    const [items, total] = await this.repo.findAndCount({
      where: { userId },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    const unreadCount = await this.repo.count({
      where: { userId, isRead: false },
    });
    return { items, total, unreadCount };
  }

  async countUnread(userId: string): Promise<number> {
    return this.repo.count({ where: { userId, isRead: false } });
  }

  async markAsRead(userId: string, id: string): Promise<void> {
    await this.repo.update({ id, userId }, { isRead: true });
  }

  async markAllAsRead(userId: string): Promise<void> {
    await this.repo.update({ userId, isRead: false }, { isRead: true });
  }
}
