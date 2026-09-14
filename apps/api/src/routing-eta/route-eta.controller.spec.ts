import { describe, expect, test, jest } from '@jest/globals';
import { Role } from '@prisma/client';

import { DomainError } from '../common/domain-error.js';
import { RouteEtaController, resolveFleetAccess } from './route-eta.controller.js';

const ORDER_ID = 'order-1';
const CUSTOMER_ID = 'cust-1';
const DRIVER_ID = 'driver-1';

function baseOrderRow(overrides: Record<string, unknown> = {}) {
  return {
    id: ORDER_ID,
    customerId: CUSTOMER_ID,
    driverId: DRIVER_ID,
    routeEtaInputRevision: 3,
    currentNextStopEstimate: null,
    currentCompletionEstimate: null,
    activeRouteSnapshot: null,
    quotedRouteSnapshot: null,
    ...overrides,
  };
}

function makePrisma(overrides: {
  order?: unknown;
  fleetMemberFindMany?: jest.Mock;
  outboxEventFindFirst?: jest.Mock;
}) {
  return {
    order: {
      findUnique: jest.fn().mockResolvedValue(overrides.order ?? null),
    },
    fleetMember: {
      findMany: overrides.fleetMemberFindMany ?? jest.fn().mockResolvedValue([]),
    },
    outboxEvent: {
      findFirst: overrides.outboxEventFindFirst ?? jest.fn().mockResolvedValue(null),
    },
  } as any;
}

describe('resolveFleetAccess', () => {
  test('splits active OWNER memberships from active DRIVER memberships of the assigned driver', async () => {
    const findMany = jest
      .fn()
      .mockResolvedValueOnce([
        { fleetId: 'fleet-a', role: 'OWNER' },
        { fleetId: 'fleet-b', role: 'DRIVER' },
      ])
      .mockResolvedValueOnce([{ fleetId: 'fleet-a' }]);
    const prisma = { fleetMember: { findMany } } as any;

    const result = await resolveFleetAccess(prisma, 'owner-1', DRIVER_ID);

    expect(result).toEqual({
      activeOwnerFleetIds: ['fleet-a'],
      activeDriverFleetIds: ['fleet-a'],
    });
    expect(findMany).toHaveBeenNthCalledWith(1, {
      where: { userId: 'owner-1', status: 'ACTIVE' },
      select: { fleetId: true, role: true },
    });
    expect(findMany).toHaveBeenNthCalledWith(2, {
      where: { userId: DRIVER_ID, status: 'ACTIVE', role: 'DRIVER' },
      select: { fleetId: true },
    });
  });

  test('skips the driver-membership lookup when the order has no assigned driver', async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const prisma = { fleetMember: { findMany } } as any;

    const result = await resolveFleetAccess(prisma, 'owner-1', null);

    expect(result).toEqual({ activeOwnerFleetIds: [], activeDriverFleetIds: [] });
    expect(findMany).toHaveBeenCalledTimes(1);
  });
});

describe('RouteEtaController.get', () => {
  const fleetOwnerActor = { userId: 'owner-1', role: Role.FLEET_OWNER, sessionId: 's' } as const;

  test('allows a Fleet Owner sharing an active fleet with the order driver', async () => {
    const prisma = makePrisma({
      order: baseOrderRow(),
      fleetMemberFindMany: jest
        .fn()
        .mockResolvedValueOnce([{ fleetId: 'fleet-a', role: 'OWNER' }])
        .mockResolvedValueOnce([{ fleetId: 'fleet-a' }]),
    });
    const controller = new RouteEtaController(prisma);

    const result = await controller.get(fleetOwnerActor, ORDER_ID);

    expect(result.orderId).toBe(ORDER_ID);
    expect(result.desiredInputRevision).toBe(3);
  });

  test('rejects a Fleet Owner without a shared active fleet with 404', async () => {
    const prisma = makePrisma({
      order: baseOrderRow(),
      fleetMemberFindMany: jest
        .fn()
        .mockResolvedValueOnce([{ fleetId: 'fleet-a', role: 'OWNER' }])
        .mockResolvedValueOnce([{ fleetId: 'fleet-b' }]),
    });
    const controller = new RouteEtaController(prisma);

    let caught: unknown;
    try {
      await controller.get(fleetOwnerActor, ORDER_ID);
      throw new Error('expected controller.get to reject');
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(DomainError);
    expect(caught).toMatchObject({ status: 404, code: 'RESOURCE_NOT_FOUND' });
  });
});
