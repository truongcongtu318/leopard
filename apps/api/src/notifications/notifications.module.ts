import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module.js';
import { DatabaseModule } from '../database/database.module.js';
import { SocketAuthAdapter } from '../tracking/socket-auth.adapter.js';
import { FirebaseMessagingService } from './firebase-messaging.service.js';
import { NOTIFICATION_FAN_OUT_PORT } from './notification-fan-out.port.js';
import { NotificationRealtimePublisher } from './notification-realtime.publisher.js';
import { NotificationsController } from './notifications.controller.js';
import { NotificationsGateway } from './notifications.gateway.js';
import { NotificationsRepository } from './notifications.repository.js';
import { NotificationsService } from './notifications.service.js';

@Module({
  imports: [AuthModule, DatabaseModule],
  controllers: [NotificationsController],
  providers: [
    NotificationsRepository,
    NotificationsService,
    SocketAuthAdapter,
    NotificationsGateway,
    // FirebaseMessagingService takes a plain options object (sender/source),
    // not injectable constructor params — wire it via factory so Nest never
    // tries to resolve them itself (mirrors OtpProviderModule's pattern for
    // FirebaseOtpProvider).
    { provide: FirebaseMessagingService, useFactory: () => new FirebaseMessagingService() },
    NotificationRealtimePublisher,
    { provide: NOTIFICATION_FAN_OUT_PORT, useExisting: NotificationRealtimePublisher },
  ],
  exports: [NotificationsService, NotificationsRepository],
})
export class NotificationsModule {}
