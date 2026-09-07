import { describe, expect, test, jest, beforeEach } from '@jest/globals';

import { NotificationRealtimePublisher } from './notification-realtime.publisher.js';

const baseNotification = {
  id: 'notif-1',
  userId: 'user-1',
  type: 'ORDER' as const,
  title: 'Đơn hàng đã được nhận',
  body: 'Tài xế đang trên đường tới điểm lấy hàng',
  data: null as unknown,
  isRead: false,
  readAt: null,
  createdAt: new Date('2026-09-01T00:00:00.000Z'),
};

describe('NotificationRealtimePublisher', () => {
  let gateway: any;
  let repo: any;
  let fcm: any;
  let publisher: NotificationRealtimePublisher;

  beforeEach(() => {
    gateway = { emitToUser: jest.fn() };
    repo = { findTokensForUser: jest.fn().mockResolvedValue([]), removeToken: jest.fn() };
    fcm = { send: jest.fn().mockResolvedValue({ invalidTokens: [] }) };
    publisher = new NotificationRealtimePublisher(gateway, repo, fcm);
  });

  test('publish() emits the socket event to the recipient before looking up push tokens', async () => {
    repo.findTokensForUser.mockResolvedValue([{ token: 'tok-1' }]);

    await publisher.publish(baseNotification as any);

    expect(gateway.emitToUser).toHaveBeenCalledWith(
      'user-1',
      expect.objectContaining({ id: 'notif-1', type: 'ORDER', title: baseNotification.title }),
    );
    const emitOrder = gateway.emitToUser.mock.invocationCallOrder[0];
    const lookupOrder = repo.findTokensForUser.mock.invocationCallOrder[0];
    expect(emitOrder).toBeLessThan(lookupOrder);
  });

  test('publish() sends push to every registered device token for the recipient', async () => {
    repo.findTokensForUser.mockResolvedValue([{ token: 'tok-1' }, { token: 'tok-2' }]);

    await publisher.publish(baseNotification as any);

    expect(fcm.send).toHaveBeenCalledWith(
      ['tok-1', 'tok-2'],
      {
        notificationId: 'notif-1',
        type: 'ORDER',
        title: baseNotification.title,
        body: baseNotification.body,
      },
    );
  });

  test('includes orderId in the push payload when present in notification.data', async () => {
    repo.findTokensForUser.mockResolvedValue([{ token: 'tok-1' }]);
    const withOrder = { ...baseNotification, data: { orderId: 'order-9' } };

    await publisher.publish(withOrder as any);

    expect(fcm.send).toHaveBeenCalledWith(['tok-1'], expect.objectContaining({ orderId: 'order-9' }));
    expect(gateway.emitToUser).toHaveBeenCalledWith(
      'user-1',
      expect.objectContaining({ orderId: 'order-9' }),
    );
  });

  test('skips the FCM call entirely when the recipient has no device tokens', async () => {
    repo.findTokensForUser.mockResolvedValue([]);

    await publisher.publish(baseNotification as any);

    expect(fcm.send).not.toHaveBeenCalled();
  });

  test('prunes only the tokens FCM reports as permanently invalid', async () => {
    repo.findTokensForUser.mockResolvedValue([{ token: 'dead' }, { token: 'good' }]);
    fcm.send.mockResolvedValue({ invalidTokens: ['dead'] });

    await publisher.publish(baseNotification as any);

    expect(repo.removeToken).toHaveBeenCalledTimes(1);
    expect(repo.removeToken).toHaveBeenCalledWith('user-1', 'dead');
  });

  test('a socket emit failure is logged and swallowed, and push still proceeds', async () => {
    gateway.emitToUser.mockImplementation(() => {
      throw new Error('socket down');
    });
    repo.findTokensForUser.mockResolvedValue([{ token: 'tok-1' }]);

    await expect(publisher.publish(baseNotification as any)).resolves.toBeUndefined();
    expect(fcm.send).toHaveBeenCalled();
  });

  test('an FCM send failure is not swallowed at this layer differently than any other rejection (bubbles to the caller)', async () => {
    repo.findTokensForUser.mockResolvedValue([{ token: 'tok-1' }]);
    fcm.send.mockRejectedValue(new Error('fcm outage'));

    await expect(publisher.publish(baseNotification as any)).rejects.toThrow('fcm outage');
  });
});
