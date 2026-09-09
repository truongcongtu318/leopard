import { describe, expect, test, jest, beforeEach } from '@jest/globals';

import { NotificationTriggers } from './notification-triggers.service.js';

describe('NotificationTriggers', () => {
  let eventsPublisher: any;
  let ordersRepository: any;
  let notificationsService: any;
  let subscribedHandler: (event: any) => void;

  beforeEach(() => {
    eventsPublisher = {
      subscribe: jest.fn((handler: (event: any) => void) => {
        subscribedHandler = handler;
        return () => {};
      }),
    };
    ordersRepository = {
      findById: jest.fn(),
    };
    notificationsService = {
      create: jest.fn().mockResolvedValue({ id: 'notif-1' }),
    };
  });

  function createTriggers(): NotificationTriggers {
    return new NotificationTriggers(eventsPublisher, ordersRepository, notificationsService);
  }

  describe('order status changed', () => {
    test('subscribes to the shared OrderEventsPublisher on construction', () => {
      createTriggers();
      expect(eventsPublisher.subscribe).toHaveBeenCalledTimes(1);
    });

    test('notifies the customer and the assigned driver for a non-accept transition', async () => {
      ordersRepository.findById.mockResolvedValue({
        id: 'order-1',
        customerId: 'customer-1',
        driverId: 'driver-1',
      });
      createTriggers();

      subscribedHandler({
        orderId: 'order-1',
        previousStatus: 'ACCEPTED',
        currentStatus: 'PICKING_UP',
        eventId: 'evt-1',
        occurredAt: new Date().toISOString(),
      });
      await flushMicrotasks();

      expect(notificationsService.create).toHaveBeenCalledTimes(2);
      expect(notificationsService.create).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'customer-1', type: 'ORDER' }),
      );
      expect(notificationsService.create).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'driver-1', type: 'ORDER' }),
      );
    });

    test('notifies only the customer for the ACCEPTED transition (canonical event, no double message)', async () => {
      ordersRepository.findById.mockResolvedValue({
        id: 'order-1',
        customerId: 'customer-1',
        driverId: 'driver-1',
      });
      createTriggers();

      subscribedHandler({
        orderId: 'order-1',
        previousStatus: 'REQUESTED',
        currentStatus: 'ACCEPTED',
        eventId: 'evt-2',
        occurredAt: new Date().toISOString(),
      });
      await flushMicrotasks();

      expect(notificationsService.create).toHaveBeenCalledTimes(1);
      expect(notificationsService.create).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'customer-1', type: 'ORDER' }),
      );
    });

    test('notifies only the customer when no driver is assigned', async () => {
      ordersRepository.findById.mockResolvedValue({
        id: 'order-1',
        customerId: 'customer-1',
        driverId: null,
      });
      createTriggers();

      subscribedHandler({
        orderId: 'order-1',
        previousStatus: 'REQUESTED',
        currentStatus: 'CANCELLED',
        eventId: 'evt-3',
        occurredAt: new Date().toISOString(),
      });
      await flushMicrotasks();

      expect(notificationsService.create).toHaveBeenCalledTimes(1);
    });

    test('does nothing when the order can no longer be found', async () => {
      ordersRepository.findById.mockResolvedValue(null);
      createTriggers();

      subscribedHandler({
        orderId: 'missing-order',
        previousStatus: 'ACCEPTED',
        currentStatus: 'PICKING_UP',
        eventId: 'evt-4',
        occurredAt: new Date().toISOString(),
      });
      await flushMicrotasks();

      expect(notificationsService.create).not.toHaveBeenCalled();
    });

    test('swallows a notification failure without rejecting or throwing', async () => {
      ordersRepository.findById.mockResolvedValue({
        id: 'order-1',
        customerId: 'customer-1',
        driverId: null,
      });
      notificationsService.create.mockRejectedValue(new Error('db down'));
      createTriggers();

      expect(() => {
        subscribedHandler({
          orderId: 'order-1',
          previousStatus: 'ACCEPTED',
          currentStatus: 'DELIVERED',
          eventId: 'evt-5',
          occurredAt: new Date().toISOString(),
        });
      }).not.toThrow();

      await flushMicrotasks();
    });
  });

  describe('notifyPaymentConfirmed', () => {
    test('creates a PAYMENT notification for the customer', async () => {
      const triggers = createTriggers();

      await triggers.notifyPaymentConfirmed({
        customerId: 'customer-1',
        orderId: 'order-1',
        amountVnd: 25000,
      });

      expect(notificationsService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'customer-1',
          type: 'PAYMENT',
          data: { orderId: 'order-1' },
        }),
      );
    });

    test('never rejects even when persistence fails', async () => {
      notificationsService.create.mockRejectedValue(new Error('db down'));
      const triggers = createTriggers();

      await expect(
        triggers.notifyPaymentConfirmed({ customerId: 'customer-1', orderId: 'order-1', amountVnd: 1000 }),
      ).resolves.toBeUndefined();
    });
  });

  describe('notifyInvoiceEmailMissing', () => {
    test('creates exactly one SYSTEM notification for the customer with the order id', async () => {
      const triggers = createTriggers();

      await triggers.notifyInvoiceEmailMissing({ customerId: 'customer-1', orderId: 'order-1' });

      expect(notificationsService.create).toHaveBeenCalledTimes(1);
      expect(notificationsService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'customer-1',
          type: 'SYSTEM',
          data: { orderId: 'order-1' },
        }),
      );
    });

    test('never rejects even when persistence fails', async () => {
      notificationsService.create.mockRejectedValue(new Error('db down'));
      const triggers = createTriggers();

      await expect(
        triggers.notifyInvoiceEmailMissing({ customerId: 'customer-1', orderId: 'order-1' }),
      ).resolves.toBeUndefined();
    });
  });
});

async function flushMicrotasks(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 0));
}
