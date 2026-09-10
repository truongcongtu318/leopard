import { OrderStatus, Role } from '@prisma/client';

import { DomainError } from '../common/domain-error.js';
import {
  assertCanSendTracking,
  assertCanViewTracking,
  type TrackingOrderAccess,
} from './tracking.policy.js';

const ORDER_ID = '10000000-0000-4000-8000-000000000001';
const CUSTOMER_ID = '10000000-0000-4000-8000-000000000002';
const DRIVER_ID = '10000000-0000-4000-8000-000000000003';

function order(overrides: Partial<TrackingOrderAccess> = {}): TrackingOrderAccess {
  return {
    id: ORDER_ID,
    status: OrderStatus.IN_TRANSIT,
    customerId: CUSTOMER_ID,
    driverId: DRIVER_ID,
    activeOwnerFleetIds: [],
    activeDriverFleetIds: [],
    ...overrides,
  };
}

function actor(role: Role, userId: string) {
  return { role, userId, sessionId: 'session-id' } as const;
}

describe('tracking policy', () => {
  describe('assertCanSendTracking', () => {
    it.each([OrderStatus.ACCEPTED, OrderStatus.PICKING_UP, OrderStatus.IN_TRANSIT])(
      'allows the assigned Driver while the order is %s',
      (status) => {
        expect(() =>
          assertCanSendTracking(actor(Role.DRIVER, DRIVER_ID), order({ status })),
        ).not.toThrow();
      },
    );

    it.each([OrderStatus.REQUESTED, OrderStatus.DELIVERED, OrderStatus.CANCELLED])(
      'rejects an inactive order in %s',
      (status) => {
        expectDomainCode(
          () => assertCanSendTracking(actor(Role.DRIVER, DRIVER_ID), order({ status })),
          'TRACKING_ORDER_INACTIVE',
        );
      },
    );

    it('rejects an unassigned Driver', () => {
      expectDomainCode(
        () =>
          assertCanSendTracking(
            actor(Role.DRIVER, '10000000-0000-4000-8000-000000000099'),
            order(),
          ),
        'TRACKING_FORBIDDEN',
      );
    });

    it.each([Role.CUSTOMER, Role.FLEET_OWNER, Role.ADMIN])(
      'rejects role %s even when it otherwise has view access',
      (role) => {
        expectDomainCode(
          () => assertCanSendTracking(actor(role, CUSTOMER_ID), order()),
          'TRACKING_FORBIDDEN',
        );
      },
    );
  });

  describe('assertCanViewTracking', () => {
    it('allows the owning Customer and rejects another Customer', () => {
      expect(() =>
        assertCanViewTracking(actor(Role.CUSTOMER, CUSTOMER_ID), order()),
      ).not.toThrow();
      expectDomainCode(
        () =>
          assertCanViewTracking(
            actor(Role.CUSTOMER, '10000000-0000-4000-8000-000000000099'),
            order(),
          ),
        'TRACKING_FORBIDDEN',
      );
    });

    it('allows the assigned Driver and rejects another Driver', () => {
      expect(() =>
        assertCanViewTracking(actor(Role.DRIVER, DRIVER_ID), order()),
      ).not.toThrow();
      expectDomainCode(
        () =>
          assertCanViewTracking(
            actor(Role.DRIVER, '10000000-0000-4000-8000-000000000099'),
            order(),
          ),
        'TRACKING_FORBIDDEN',
      );
    });

    it('allows an active Fleet Owner only when the assigned Driver is active in the same fleet', () => {
      const scopedOrder = order({
        activeOwnerFleetIds: ['fleet-a'],
        activeDriverFleetIds: ['fleet-b', 'fleet-a'],
      });

      expect(() =>
        assertCanViewTracking(actor(Role.FLEET_OWNER, 'owner-id'), scopedOrder),
      ).not.toThrow();

      expectDomainCode(
        () =>
          assertCanViewTracking(
            actor(Role.FLEET_OWNER, 'owner-id'),
            order({
              activeOwnerFleetIds: ['fleet-a'],
              activeDriverFleetIds: ['fleet-b'],
            }),
          ),
        'TRACKING_FORBIDDEN',
      );
    });

    it('rejects Fleet Owner access when either membership is inactive or absent', () => {
      for (const access of [
        order({ activeOwnerFleetIds: [], activeDriverFleetIds: ['fleet-a'] }),
        order({ activeOwnerFleetIds: ['fleet-a'], activeDriverFleetIds: [] }),
      ]) {
        expectDomainCode(
          () => assertCanViewTracking(actor(Role.FLEET_OWNER, 'owner-id'), access),
          'TRACKING_FORBIDDEN',
        );
      }
    });

    it('allows Admin to view', () => {
      expect(() =>
        assertCanViewTracking(actor(Role.ADMIN, 'admin-id'), order()),
      ).not.toThrow();
    });
  });
});

function expectDomainCode(action: () => void, code: string): void {
  try {
    action();
    throw new Error(`Expected DomainError ${code}`);
  } catch (error) {
    expect(error).toBeInstanceOf(DomainError);
    expect((error as DomainError).code).toBe(code);
  }
}
