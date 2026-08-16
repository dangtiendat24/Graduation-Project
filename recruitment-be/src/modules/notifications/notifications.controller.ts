import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { NotificationsService } from './notifications.service';
import { GetNotificationsQueryDto } from './dto/get-notifications-query.dto';

interface JwtUser {
  id: string;
  email: string;
  role: string;
}

@ApiTags('notifications')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @ApiOperation({ summary: 'Danh sách thông báo của user đang đăng nhập' })
  @Get()
  findAll(
    @Request() req: { user: JwtUser },
    @Query() query: GetNotificationsQueryDto,
  ) {
    return this.notificationsService.findForUser(
      req.user.id,
      query.page ?? 1,
      query.limit ?? 15,
    );
  }

  @ApiOperation({ summary: 'Số thông báo chưa đọc' })
  @Get('unread-count')
  async unreadCount(@Request() req: { user: JwtUser }) {
    return {
      unreadCount: await this.notificationsService.countUnread(req.user.id),
    };
  }

  @ApiOperation({ summary: 'Đánh dấu 1 thông báo đã đọc' })
  @Patch(':id/read')
  markAsRead(
    @Request() req: { user: JwtUser },
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.notificationsService.markAsRead(req.user.id, id);
  }

  @ApiOperation({ summary: 'Đánh dấu tất cả thông báo đã đọc' })
  @Patch('read-all')
  markAllAsRead(@Request() req: { user: JwtUser }) {
    return this.notificationsService.markAllAsRead(req.user.id);
  }
}
