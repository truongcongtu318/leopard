/// <reference types="jest" />

import { AcceptOrderService } from '../src/orders/accept-order.service.js';
import { UpdateOrderStatusService } from '../src/orders/update-order-status.service.js';
import { OrderEventsPublisher } from '../src/orders/order-events.publisher.js';
import { OrdersRepository } from '../src/orders/orders.repository.js';
import { PrismaDeliveryProofReader } from '../src/orders/domain/delivery-proof-reader.js';
import { NotificationsRepository } from '../src/notifications/notifications.repository.js';
import { NotificationsService } from '../src/notifications/notifications.service.js';
import { NotificationTriggers } from '../src/notifications/notification-triggers.service.js';
import { InMemoryPrismaService } from './prisma-mock.js';

/**
 * Wires the real (non-mocked) NotificationTriggers/NotificationsService
 * against the same OrderEventsPublisher instance that AcceptOrderService
 * and UpdateOrderStatusService publish on, backed by the in-memory Prisma
 * mock. This proves notifications are persisted from real committed
 * business events end-to-end — not just that a service method was called.
 */
describe('Notification triggers wired to committed order events (Integration)', () => {
  let prismaMock: InMemoryPrismaService;
  let ordersRepository: OrdersRepository;
  let eventsPublisher: OrderEventsPublisher;
  let acceptOrderService: AcceptOrderService;
  let updateOrderStatusService: UpdateOrderStatusService;

  let customerId: string;
  let driverId: string;
  let orderId: string;

  beforeEach(async () => {
    prismaMock = new InMemoryPrismaService();
    ordersRepository = new OrdersRepository(prismaMock as any);
    eventsPublisher = new OrderEventsPublisher();

    const notificationsRepository = new NotificationsRepository(prismaMock as any);
    const notificationsService = new NotificationsService(notificationsRepository);
    // Subscribes to eventsPublisher in its own constructor (fire-and-forget).
    new NotificationTriggers(eventsPublisher, ordersRepository, notificationsService);

    acceptOrderService = new AcceptOrderService(prismaMock as any, ordersRepository, eventsPublisher);
    updateOrderStatusService = new UpdateOrderStatusService(
      prismaMock as any,
      ordersRepository,
      new PrismaDeliveryProofReader(prismaMock as any),
      eventsPublisher,
    );

    const customer = await prismaMock.user.create({
      data: { phone: '+84900000001', role: 'CUSTOMER', status: 'ACTIVE' },
    });
    customerId = customer.id;

    const driver = await prismaMock.user.create({
      data: { phone: '+84900000002', role: 'DRIVER', status: 'ACTIVE' },
    });
    driverId = driver.id;
    await prismaMock.driverProfile.create({
      data: { userId: driverId, availability: 'AVAILABLE', vehicleType: 'MOTORBIKE' },
    });

    const order = await prismaMock.order.create({
      data: { customerId, status: 'REQUESTED', distanceMeters: 1000, durationSeconds: 300, priceVnd: 20000 },
    });
    orderId = order.id;
  });

  function notificationCount(): number {
    return prismaMock.notifications.size;
  }

  // NotificationTriggers reacts to a published event fire-and-forget (it is
  // never awaited by the publisher), and its handler chains several of its
  // own awaits (order lookup, then one `notificationsService.create` per
  // recipient). A fixed number of `Promise.resolve()` hops is not reliably
  // enough headroom for that whole chain, so flush via a macrotask instead
  // — a `setTimeout` callback only runs once the microtask queue is fully
  // drained, however deep the pending chain is.
  async function flushMicrotasks(): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 0));
  }

  it('persists exactly one notification for the customer when a driver accepts', async () => {
    await acceptOrderService.acceptOrder({ userId: driverId, role: 'DRIVER' } as any, orderId);
    await flushMicrotasks();

    expect(notificationCount()).toBe(1);
    const [notification] = Array.from(prismaMock.notifications.values());
    expect(notification.userId).toBe(customerId);
    expect(notification.type).toBe('ORDER');
  });

  it('creates no notification when a second driver loses the accept race (409)', async () => {
    await acceptOrderService.acceptOrder({ userId: driverId, role: 'DRIVER' } as any, orderId);
    await flushMicrotasks();
    const countAfterFirstAccept = notificationCount();

    const otherDriver = await prismaMock.user.create({
      data: { phone: '+84900000003', role: 'DRIVER', status: 'ACTIVE' },
    });
    await prismaMock.driverProfile.create({
      data: { userId: otherDriver.id, availability: 'AVAILABLE', vehicleType: 'MOTORBIKE' },
    });

    await expect(
      acceptOrderService.acceptOrder({ userId: otherDriver.id, role: 'DRIVER' } as any, orderId),
    ).rejects.toThrow();
    await flushMicrotasks();

    expect(notificationCount()).toBe(countAfterFirstAccept);
  });

  it('persists one notification for the customer and one for the driver on a subsequent status update', async () => {
    await acceptOrderService.acceptOrder({ userId: driverId, role: 'DRIVER' } as any, orderId);
    await flushMicrotasks();
    const baseline = notificationCount();

    await updateOrderStatusService.updateStatus(
      { userId: driverId, role: 'DRIVER' } as any,
      orderId,
      { status: 'PICKING_UP' } as any,
    );
    await flushMicrotasks();

    expect(notificationCount()).toBe(baseline + 2);
    const recipients = Array.from(prismaMock.notifications.values()).map((n) => n.userId);
    expect(recipients).toEqual(expect.arrayContaining([customerId, driverId]));
  });

  it('creates no notification when a status update is rejected (driver not assigned to this order)', async () => {
    await acceptOrderService.acceptOrder({ userId: driverId, role: 'DRIVER' } as any, orderId);
    await flushMicrotasks();
    const baseline = notificationCount();

    const impostor = await prismaMock.user.create({
      data: { phone: '+84900000004', role: 'DRIVER', status: 'ACTIVE' },
    });

    await expect(
      updateOrderStatusService.updateStatus(
        { userId: impostor.id, role: 'DRIVER' } as any,
        orderId,
        { status: 'PICKING_UP' } as any,
      ),
    ).rejects.toThrow();
    await flushMicrotasks();

    expect(notificationCount()).toBe(baseline);
  });

  it('creates no notification for an invalid status transition', async () => {
    await acceptOrderService.acceptOrder({ userId: driverId, role: 'DRIVER' } as any, orderId);
    await flushMicrotasks();
    const baseline = notificationCount();

    await expect(
      updateOrderStatusService.updateStatus(
        { userId: driverId, role: 'DRIVER' } as any,
        orderId,
        { status: 'DELIVERED' } as any,
      ),
    ).rejects.toThrow();
    await flushMicrotasks();

    expect(notificationCount()).toBe(baseline);
  });
});
