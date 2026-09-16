import { Role } from '@prisma/client';

import { DomainError } from '../common/domain-error.js';
import { assertCanViewRouteEta } from './route-eta.policy.js';

describe('assertCanViewRouteEta', () => {
  const baseOrder = {
    customerId: 'cust-1',
    driverId: 'driver-1',
  };

  it('allows the owning customer', () => {
    expect(() =>
      assertCanViewRouteEta({ userId: 'cust-1', role: Role.CUSTOMER } as any, baseOrder),
    ).not.toThrow();
  });

  it('allows the assigned driver', () => {
    expect(() =>
      assertCanViewRouteEta({ userId: 'driver-1', role: Role.DRIVER } as any, baseOrder),
    ).not.toThrow();
  });

  it('rejects an unassigned driver with 404 (not 403 — conceal existence)', () => {
    try {
      assertCanViewRouteEta({ userId: 'driver-2', role: Role.DRIVER } as any, baseOrder);
      fail('expected throw');
    } catch (error) {
      expect(error).toBeInstanceOf(DomainError);
      expect((error as DomainError).status).toBe(404);
    }
  });
});
