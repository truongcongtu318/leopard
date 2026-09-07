import { describe, expect, test, jest } from '@jest/globals';

import { FirebaseMessagingService } from './firebase-messaging.service.js';

const baseInput = {
  notificationId: 'notif-1',
  type: 'ORDER',
  title: 'Đơn hàng đã được nhận',
  body: 'Tài xế đang trên đường tới điểm lấy hàng',
};

describe('FirebaseMessagingService', () => {
  describe('disabled FCM', () => {
    test('is a no-op and never invokes the sender when FCM_ENABLED is not "true"', async () => {
      const sender = jest.fn();
      const service = new FirebaseMessagingService({
        sender,
        source: { FCM_ENABLED: 'false', FIREBASE_PROJECT_ID: 'proj' },
      });

      const result = await service.send(['tok-1'], baseInput);

      expect(result).toEqual({ invalidTokens: [] });
      expect(sender).not.toHaveBeenCalled();
    });

    test('is a no-op when FCM_ENABLED is unset', async () => {
      const sender = jest.fn();
      const service = new FirebaseMessagingService({ sender, source: {} });

      const result = await service.send(['tok-1'], baseInput);

      expect(result).toEqual({ invalidTokens: [] });
      expect(sender).not.toHaveBeenCalled();
    });

    test('is a no-op with no tokens even when enabled', async () => {
      const sender = jest.fn();
      const service = new FirebaseMessagingService({
        sender,
        source: { FCM_ENABLED: 'true' },
      });

      const result = await service.send([], baseInput);

      expect(result).toEqual({ invalidTokens: [] });
      expect(sender).not.toHaveBeenCalled();
    });
  });

  describe('missing credentials', () => {
    test('is a safe no-op when enabled but no FIREBASE_PROJECT_ID is configured and no sender is injected', async () => {
      const service = new FirebaseMessagingService({
        source: { FCM_ENABLED: 'true' },
      });

      await expect(service.send(['tok-1'], baseInput)).resolves.toEqual({ invalidTokens: [] });
    });
  });

  describe('enabled with a working sender', () => {
    test('sends the string-only data payload (notificationId, type, orderId) to every token', async () => {
      const sender = jest.fn().mockResolvedValue(undefined);
      const service = new FirebaseMessagingService({
        sender,
        source: { FCM_ENABLED: 'true' },
      });

      const result = await service.send(['tok-1', 'tok-2'], { ...baseInput, orderId: 'order-9' });

      expect(result).toEqual({ invalidTokens: [] });
      expect(sender).toHaveBeenCalledTimes(2);
      expect(sender).toHaveBeenCalledWith({
        token: 'tok-1',
        notification: { title: baseInput.title, body: baseInput.body },
        data: { notificationId: 'notif-1', type: 'ORDER', orderId: 'order-9' },
      });
    });

    test('omits orderId from the data payload when not provided', async () => {
      const sender = jest.fn().mockResolvedValue(undefined);
      const service = new FirebaseMessagingService({ sender, source: { FCM_ENABLED: 'true' } });

      await service.send(['tok-1'], baseInput);

      expect(sender).toHaveBeenCalledWith(
        expect.objectContaining({ data: { notificationId: 'notif-1', type: 'ORDER' } }),
      );
    });
  });

  describe('per-token isolated delivery', () => {
    test('a permanent-invalid-token error prunes only that token; others still succeed', async () => {
      const sender = jest
        .fn()
        .mockRejectedValueOnce({ code: 'messaging/registration-token-not-registered' })
        .mockResolvedValueOnce(undefined);
      const service = new FirebaseMessagingService({ sender, source: { FCM_ENABLED: 'true' } });

      const result = await service.send(['dead-token', 'good-token'], baseInput);

      expect(result).toEqual({ invalidTokens: ['dead-token'] });
      expect(sender).toHaveBeenCalledTimes(2);
    });

    test('a transient failure does not mark the token invalid and does not throw', async () => {
      const sender = jest.fn().mockRejectedValue({ code: 'messaging/internal-error' });
      const service = new FirebaseMessagingService({ sender, source: { FCM_ENABLED: 'true' } });

      const result = await service.send(['flaky-token'], baseInput);

      expect(result).toEqual({ invalidTokens: [] });
    });

    test('one token throwing does not stop delivery to the remaining tokens', async () => {
      const sender = jest
        .fn()
        .mockRejectedValueOnce(new Error('network blip'))
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce({ code: 'messaging/invalid-registration-token' });
      const service = new FirebaseMessagingService({ sender, source: { FCM_ENABLED: 'true' } });

      const result = await service.send(['tok-a', 'tok-b', 'tok-c'], baseInput);

      expect(sender).toHaveBeenCalledTimes(3);
      expect(result).toEqual({ invalidTokens: ['tok-c'] });
    });
  });
});
