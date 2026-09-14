import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseFilters,
  UseGuards,
} from '@nestjs/common';
import type { OrderMessage } from '@prisma/client';
import { CurrentUser, type AuthenticatedActor } from '../auth/decorators/current-user.js';
import { RequireRoles } from '../auth/decorators/require-roles.js';
import { AccessTokenGuard } from '../auth/guards/access-token.guard.js';
import { RoleGuard } from '../auth/guards/role.guard.js';
import { ApiExceptionFilter } from '../common/api-exception.filter.js';
import { ChatService } from './chat.service.js';
import { SendMessageDto } from './dto/send-message.dto.js';

@Controller('orders')
@UseFilters(ApiExceptionFilter)
@UseGuards(AccessTokenGuard, RoleGuard)
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Get(':id/messages')
  listMessages(
    @CurrentUser() actor: AuthenticatedActor,
    @Param('id') id: string,
  ): Promise<OrderMessage[]> {
    return this.chatService.listOrderMessages(actor.userId, id);
  }

  @Post(':id/messages')
  @RequireRoles('CUSTOMER', 'DRIVER')
  @HttpCode(HttpStatus.CREATED)
  sendMessage(
    @CurrentUser() actor: AuthenticatedActor,
    @Param('id') id: string,
    @Body() dto: SendMessageDto,
  ): Promise<OrderMessage> {
    return this.chatService.sendMessage(actor.userId, id, dto);
  }
}
