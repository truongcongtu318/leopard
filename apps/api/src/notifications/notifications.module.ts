import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module.js';
import { DatabaseModule } from '../database/database.module.js';
import { OrdersModule } from '../orders/orders.module.js';
import { SocketAuthAdapter } from '../tracking/socket-auth.adapter.js';
import { FirebaseMessagingService } from './firebase-messaging.service.js';
import { NOTIFICATION_FAN_OUT_PORT } from './notification-fan-out.port.js';
import { NotificationRealtimePublisher } from './notification-realtime.publisher.js';
import { NotificationTriggers } from './notification-triggers.service.js';
import { NotificationsController } from './notifications.controller.js';
import { NotificationsGateway } from './notifications.gateway.js';
import { NotificationsRepository } from './notifications.repository.js';
import { NotificationsService } from './notifications.service.js';

@Module({
  imports: [AuthModule, DatabaseModule, OrdersModule],
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
    // Subscribes to OrderEventsPublisher (exported by OrdersModule) in its
    // constructor, mirroring TrackingGateway — see notification-triggers.service.ts.
    NotificationTriggers,
  ],
  exports: [NotificationsService, NotificationsRepository, NotificationTriggers],
})
export class NotificationsModule {}
