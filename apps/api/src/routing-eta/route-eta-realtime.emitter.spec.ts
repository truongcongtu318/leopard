import { Test } from '@nestjs/testing';
import { RouteEtaRealtimeEmitterImpl } from './route-eta-realtime.emitter.js';

describe('RouteEtaRealtimeEmitterImpl', () => {
  it('emits routeEtaUpdated to the order room via the injected server', () => {
    const server = { to: jest.fn().mockReturnThis(), emit: jest.fn() };
    const emitter = new RouteEtaRealtimeEmitterImpl();
    emitter.attach(server as any);

    const event = {
      schemaVersion: 1 as const, eventId: 'evt-1', orderId: 'order-1', inputRevision: 6, occurredAt: new Date().toISOString(),
      estimates: { nextStop: {} as any, completion: {} as any },
    };
    emitter.emitRouteEtaUpdated(event);

    expect(server.to).toHaveBeenCalledWith('order:order-1');
    expect(server.emit).toHaveBeenCalledWith('route-eta:updated', event);
  });
});
