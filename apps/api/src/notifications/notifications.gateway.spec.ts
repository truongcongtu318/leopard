import { describe, expect, test, jest, beforeEach } from '@jest/globals';
import { NotificationSocketEvent } from '@leopard/shared';

import { NotificationsGateway, readToken } from './notifications.gateway.js';

function createSocket(overrides: Record<string, unknown> = {}) {
  return {
    handshake: { auth: { token: 'valid-token' }, headers: {} },
    data: {},
    join: jest.fn().mockResolvedValue(undefined),
    emit: jest.fn(),
    disconnect: jest.fn(),
    ...overrides,
  } as any;
}

describe('NotificationsGateway', () => {
  let auth: any;
  let gateway: NotificationsGateway;

  beforeEach(() => {
    auth = { authenticate: jest.fn() };
    gateway = new NotificationsGateway(auth);
  });

  describe('handleConnection', () => {
    test('joins only the caller\'s own user:<userId> room on a valid token', async () => {
      const actor = { userId: 'user-1', role: 'CUSTOMER', sessionId: 'sess-1' };
      auth.authenticate.mockResolvedValue(actor);
      const client = createSocket();

      await gateway.handleConnection(client);

      expect(auth.authenticate).toHaveBeenCalledWith('valid-token');
      expect(client.join).toHaveBeenCalledWith('user:user-1');
      expect(client.join).toHaveBeenCalledTimes(1);
      expect(client.disconnect).not.toHaveBeenCalled();
    });

    test('emits session:error and disconnects when no token is present', async () => {
      const client = createSocket({ handshake: { auth: {}, headers: {} } });

      await gateway.handleConnection(client);

      expect(auth.authenticate).not.toHaveBeenCalled();
      expect(client.join).not.toHaveBeenCalled();
      expect(client.emit).toHaveBeenCalledWith(
        NotificationSocketEvent.sessionError,
        expect.objectContaining({ code: 'AUTH_REQUIRED' }),
      );
      expect(client.disconnect).toHaveBeenCalledWith(true);
    });

    test('emits session:error and disconnects when the token fails authentication', async () => {
      auth.authenticate.mockRejectedValue(new Error('invalid session'));
      const client = createSocket();

      await gateway.handleConnection(client);

      expect(client.join).not.toHaveBeenCalled();
      expect(client.emit).toHaveBeenCalledWith(
        NotificationSocketEvent.sessionError,
        expect.objectContaining({ code: 'AUTH_REQUIRED' }),
      );
      expect(client.disconnect).toHaveBeenCalledWith(true);
    });

    test('reads a Bearer token from the Authorization header when handshake.auth.token is absent', async () => {
      const actor = { userId: 'user-2', role: 'DRIVER', sessionId: 'sess-2' };
      auth.authenticate.mockResolvedValue(actor);
      const client = createSocket({
        handshake: { auth: {}, headers: { authorization: 'Bearer header-token' } },
      });

      await gateway.handleConnection(client);

      expect(auth.authenticate).toHaveBeenCalledWith('header-token');
      expect(client.join).toHaveBeenCalledWith('user:user-2');
    });
  });

  describe('emitToUser', () => {
    test('emits notification:new only to the target user\'s room', () => {
      const to = jest.fn().mockReturnValue({ emit: jest.fn() });
      const server = { to };
      (gateway as any).server = server;
      const event = {
        id: 'notif-1',
        type: 'ORDER',
        title: 'Đơn hàng đã được nhận',
        body: 'Tài xế đang trên đường tới điểm lấy hàng',
        createdAt: '2026-09-01T00:00:00.000Z',
      };

      gateway.emitToUser('user-1', event);

      expect(to).toHaveBeenCalledWith('user:user-1');
      expect(to('user:user-1').emit).toHaveBeenCalledWith(NotificationSocketEvent.created, event);
    });

    test('does not throw when the server is not yet attached', () => {
      expect(() => gateway.emitToUser('user-1', {
        id: 'notif-1',
        type: 'ORDER',
        title: 't',
        body: 'b',
        createdAt: '2026-09-01T00:00:00.000Z',
      })).not.toThrow();
    });
  });
});

describe('readToken', () => {
  test('prefers handshake.auth.token over the Authorization header', () => {
    const token = readToken({
      handshake: {
        auth: { token: 'from-auth' },
        headers: { authorization: 'Bearer from-header' },
      } as any,
    });
    expect(token).toBe('from-auth');
  });

  test('returns undefined when neither source has a token', () => {
    expect(readToken({ handshake: { auth: {}, headers: {} } as any })).toBeUndefined();
  });
});
