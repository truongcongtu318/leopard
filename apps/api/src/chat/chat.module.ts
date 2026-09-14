import { Module } from '@nestjs/common';
import { AccountStatusCache } from '../auth/guards/account-status-cache.js';
import { AuthModule } from '../auth/auth.module.js';
import { DatabaseModule } from '../database/database.module.js';
import { TrackingModule } from '../tracking/tracking.module.js';
import { ChatGateway } from './chat.gateway.js';
import { ChatController } from './chat.controller.js';
import { ChatService } from './chat.service.js';

@Module({
  imports: [AuthModule, DatabaseModule, TrackingModule],
  controllers: [ChatController],
  providers: [AccountStatusCache, ChatService, ChatGateway],
  exports: [ChatService],
})
export class ChatModule {}
