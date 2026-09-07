import { Body, Controller, Delete, Get, Param, Post, Query, UseFilters, UseGuards } from '@nestjs/common';
import type { DeviceToken, Notification } from '@prisma/client';

import { AccessTokenGuard } from '../auth/guards/access-token.guard.js';
import { RoleGuard } from '../auth/guards/role.guard.js';
import { CurrentUser, type AuthenticatedActor } from '../auth/decorators/current-user.js';
import { ApiExceptionFilter } from '../common/api-exception.filter.js';
import { RegisterTokenDto, RemoveTokenDto } from './dto/device-token.dto.js';
import { ListNotificationsQueryDto } from './dto/list-notifications-query.dto.js';
import type { NotificationPage } from './notifications.repository.js';
import { NotificationsService } from './notifications.service.js';

// Static routes (unread-count, read-all, register-token) are declared
// before the parameterized `:id/read` route below so Nest/Express does not
// try to match e.g. "unread-count" as an `:id` value.
@Controller('notifications')
@UseFilters(ApiExceptionFilter)
@UseGuards(AccessTokenGuard, RoleGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  async list(
    @CurrentUser() actor: AuthenticatedActor,
    @Query() query: ListNotificationsQueryDto,
  ): Promise<NotificationPage> {
    return this.notificationsService.list(actor.userId, query.page, query.pageSize);
  }

  @Get('unread-count')
  async unreadCount(@CurrentUser() actor: AuthenticatedActor): Promise<{ count: number }> {
    return this.notificationsService.unreadCount(actor.userId);
  }

  @Post('read-all')
  async markAllRead(@CurrentUser() actor: AuthenticatedActor): Promise<{ count: number }> {
    return this.notificationsService.markAllRead(actor.userId);
  }

  @Post('register-token')
  async registerToken(
    @CurrentUser() actor: AuthenticatedActor,
    @Body() dto: RegisterTokenDto,
  ): Promise<DeviceToken> {
    return this.notificationsService.registerToken(actor.userId, dto.token, dto.platform);
  }

  @Delete('register-token')
  async removeToken(
    @CurrentUser() actor: AuthenticatedActor,
    @Body() dto: RemoveTokenDto,
  ): Promise<{ success: true }> {
    await this.notificationsService.removeToken(actor.userId, dto.token);
    return { success: true };
  }

  @Post(':id/read')
  async markRead(
    @CurrentUser() actor: AuthenticatedActor,
    @Param('id') id: string,
  ): Promise<Notification> {
    return this.notificationsService.markRead(actor.userId, id);
  }
}
