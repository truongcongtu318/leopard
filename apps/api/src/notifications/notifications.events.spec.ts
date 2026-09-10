import { describe, expect, test } from '@jest/globals';

import { notificationCreatedEvent, sessionErrorEvent } from './notifications.events.js';

describe('sessionErrorEvent', () => {
  test('builds the code/message envelope', () => {
    expect(sessionErrorEvent('AUTH_REQUIRED', 'Bạn cần đăng nhập để tiếp tục')).toEqual({
      code: 'AUTH_REQUIRED',
      message: 'Bạn cần đăng nhập để tiếp tục',
    });
  });
});

describe('notificationCreatedEvent', () => {
  const notification = {
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

  test('maps the persisted row to the narrow wire payload, without userId or raw data', () => {
    const event = notificationCreatedEvent(notification as any);

    expect(event).toEqual({
      id: 'notif-1',
      type: 'ORDER',
      title: notification.title,
      body: notification.body,
      createdAt: '2026-09-01T00:00:00.000Z',
    });
    expect(event).not.toHaveProperty('userId');
    expect(event).not.toHaveProperty('data');
    expect(event).not.toHaveProperty('isRead');
  });

  test('lifts orderId out of data when present', () => {
    const withOrder = { ...notification, data: { orderId: 'order-9' } };

    const event = notificationCreatedEvent(withOrder as any);

    expect(event.orderId).toBe('order-9');
  });

  test('omits orderId when data has no orderId field', () => {
    const withOtherData = { ...notification, data: { promoCode: 'ABC' } };

    const event = notificationCreatedEvent(withOtherData as any);

    expect(event).not.toHaveProperty('orderId');
    expect(event).not.toHaveProperty('promoCode');
  });
});
