import { describe, expect, it, jest } from '@jest/globals';
import type { DispatchOfferEvent } from '@leopard/shared';

import type { SocketFactory, SocketLike } from '@leopard/mobile-core';
import {
  DispatchOfferListener,
  mapDispatchOfferEvent,
} from './dispatch-offer-listener';

const SAMPLE_EVENT: DispatchOfferEvent = {
  orderId: '11111111-1111-4111-8111-111111111001',
  pickup: { lat: 10.7326, lng: 106.7168 },
  pickupAddress: 'Kho Sao Mai, Q.7',
  dropoffAddress: 'Thủ Đức',
  vehicleType: 'MOTORBIKE',
  priceVnd: 68_000,
  distanceMeters: 12_000,
  durationSeconds: 1_500,
  cargoNote: 'Hàng dễ vỡ',
  driverDistanceM: 240,
  timeoutSeconds: 25,
};

function createMockSocket(): SocketLike {
  const listeners = new Map<string, (...args: any[]) => void>();
  return {
    connected: false,
    connect: jest.fn(),
    disconnect: jest.fn(),
    emit: jest.fn(),
    on: jest.fn((event: string, fn: (...args: any[]) => void) => {
      listeners.set(event, fn);
    }),
    off: jest.fn(),
    removeAllListeners: jest.fn(),
    // test helper, not part of SocketLike
    __trigger: (event: string, payload: unknown) => listeners.get(event)?.(payload),
  } as unknown as SocketLike & { __trigger: (event: string, payload: unknown) => void };
}

describe('mapDispatchOfferEvent', () => {
  it('maps a raw DispatchOfferEvent into an IncomingDispatchOffer view', () => {
    const offer = mapDispatchOfferEvent(SAMPLE_EVENT);

    expect(offer).toEqual({
      id: SAMPLE_EVENT.orderId,
      reference: expect.stringMatching(/^LP-/),
      pickupDistanceLabel: 'Cách bạn 0,2 km',
      pickupAddress: 'Kho Sao Mai, Q.7',
      dropoffAddress: 'Thủ Đức',
      tripDistanceLabel: '12,0 km',
      etaLabel: 'Thời gian dự kiến · 25 phút',
      priceLabel: '68.000 ₫',
      vehicleLabel: 'Xe máy',
      cargoSummary: 'Hàng dễ vỡ',
      timeoutSeconds: 25,
    });
  });

  it('falls back to the default 25s timeout when the event omits it', () => {
    const offer = mapDispatchOfferEvent({ ...SAMPLE_EVENT, timeoutSeconds: undefined as unknown as number });
    expect(offer.timeoutSeconds).toBe(25);
  });
});

describe('DispatchOfferListener', () => {
  it('does not connect when no auth token is available', () => {
    const socketFactory = jest.fn<SocketFactory>();
    const listener = new DispatchOfferListener({
      socketFactory,
      tokenProvider: () => null,
    });

    listener.connect();

    expect(socketFactory).not.toHaveBeenCalled();
  });

  it('connects to the /dispatch namespace with the auth token and maps incoming offers', () => {
    const socket = createMockSocket();
    const socketFactory = jest.fn<SocketFactory>().mockReturnValue(socket);
    const onOffer = jest.fn();

    const listener = new DispatchOfferListener({
      socketFactory,
      serverUrl: 'https://api.leopard.test',
      tokenProvider: () => 'test-token',
      onOffer,
    });

    listener.connect();

    expect(socketFactory).toHaveBeenCalledWith('https://api.leopard.test/dispatch', {
      auth: { token: 'test-token' },
      transports: ['websocket'],
    });
    expect(socket.connect).toHaveBeenCalledTimes(1);

    (socket as any).__trigger('dispatch:offer', SAMPLE_EVENT);

    expect(onOffer).toHaveBeenCalledWith(
      expect.objectContaining({ id: SAMPLE_EVENT.orderId, priceLabel: '68.000 ₫' }),
    );
  });

  it('does not open a second socket if already connected', () => {
    const socket = createMockSocket();
    const socketFactory = jest.fn<SocketFactory>().mockReturnValue(socket);
    const listener = new DispatchOfferListener({ socketFactory, tokenProvider: () => 'test-token' });

    listener.connect();
    listener.connect();

    expect(socketFactory).toHaveBeenCalledTimes(1);
  });

  it('disconnects and removes listeners on disconnect()', () => {
    const socket = createMockSocket();
    const socketFactory = jest.fn<SocketFactory>().mockReturnValue(socket);
    const listener = new DispatchOfferListener({ socketFactory, tokenProvider: () => 'test-token' });

    listener.connect();
    listener.disconnect();

    expect(socket.removeAllListeners).toHaveBeenCalledTimes(1);
    expect(socket.disconnect).toHaveBeenCalledTimes(1);
  });
});
