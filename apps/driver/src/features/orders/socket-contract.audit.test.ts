import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { io } from 'socket.io-client';
import { createSocketFactory } from '@leopard/mobile-core';
import { DISPATCH_NAMESPACE, TRACKING_NAMESPACE } from '../../../../../packages/shared/src/socket';
import { OrderStatus } from '../../../../../packages/shared/src/domain/order/order-status';

import { DispatchOfferListener } from './dispatch-offer-listener';
import { DriverTrackingSender } from './tracking-sender';

jest.mock('socket.io-client', () => ({ io: jest.fn() }));

// Audit assertions encode the intended BE contract. They deliberately remain RED
// until the implementation is corrected; they do not bless current bad URLs.
describe('Driver socket and lifecycle contract audit', () => {
  const originalApiUrl = process.env.EXPO_PUBLIC_API_URL;
  const origin = 'http://127.0.0.1:3000';
  const socket = {
    connected: false,
    connect: jest.fn(),
    disconnect: jest.fn(),
    emit: jest.fn(),
    on: jest.fn(),
    off: jest.fn(),
    removeAllListeners: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(io).mockReturnValue(socket as unknown as ReturnType<typeof io>);
    process.env.EXPO_PUBLIC_API_URL = `${origin}/api/v1`;
  });

  afterEach(() => {
    if (originalApiUrl === undefined) delete process.env.EXPO_PUBLIC_API_URL;
    else process.env.EXPO_PUBLIC_API_URL = originalApiUrl;
  });

  it('connects tracking to the BE namespace when REST base contains /api/v1', async () => {
    const sender = new DriverTrackingSender({
      socketFactory: createSocketFactory,
      tokenProvider: () => 'audit-token',
    });
    await sender.connect();
    sender.disconnect();

    expect(io).toHaveBeenCalledWith(`${origin}${TRACKING_NAMESPACE}`, {
      auth: { token: 'audit-token' },
      transports: ['websocket'],
    });
  });

  it('connects dispatch to the BE namespace when REST base contains /api/v1', () => {
    const listener = new DispatchOfferListener({ tokenProvider: () => 'audit-token' });
    listener.connect();
    listener.disconnect();

    expect(io).toHaveBeenCalledWith(`${origin}${DISPATCH_NAMESPACE}`, {
      auth: { token: 'audit-token' },
      transports: ['websocket'],
    });
  });

  it('preserves an explicit origin-only override for tracking and dispatch', async () => {
    const sender = new DriverTrackingSender({
      serverUrl: origin,
      socketFactory: createSocketFactory,
      tokenProvider: () => 'audit-token',
    });
    const listener = new DispatchOfferListener({
      serverUrl: origin,
      tokenProvider: () => 'audit-token',
    });
    await sender.connect();
    listener.connect();
    sender.disconnect();
    listener.disconnect();

    expect(jest.mocked(io).mock.calls.map(([uri]) => uri)).toEqual([
      `${origin}${TRACKING_NAMESPACE}`,
      `${origin}${DISPATCH_NAMESPACE}`,
    ]);
  });

  it('exports only order statuses that the persistent schema supports', () => {
    const schema = readFileSync(resolve(__dirname, '../../../../api/prisma/schema.prisma'), 'utf8');
    const enumBody = schema.match(/enum OrderStatus\s*\{([^}]+)\}/)?.[1];
    expect(enumBody).toBeDefined();
    const persistedStatuses = enumBody!.trim().split(/\s+/);
    expect(OrderStatus.filter((status) => !persistedStatuses.includes(status))).toEqual([]);
  });
});
