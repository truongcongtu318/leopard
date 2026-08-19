import { describe, expect, it } from '@jest/globals';

import {
  CUSTOMER_CREATE_SCENARIOS,
  CUSTOMER_DETAIL_SCENARIOS,
  CUSTOMER_LIST_SCENARIOS,
  createCustomerCreateFixture,
  createCustomerDetailFixture,
  createCustomerListFixture,
} from './fixtures';

describe('Customer Wave 4 fixtures', () => {
  it('covers every approved Customer scenario with deterministic snapshots', () => {
    expect(CUSTOMER_LIST_SCENARIOS).toHaveLength(9);
    expect(CUSTOMER_CREATE_SCENARIOS).toHaveLength(20);
    expect(CUSTOMER_DETAIL_SCENARIOS).toHaveLength(27);

    for (const scenarioId of CUSTOMER_LIST_SCENARIOS) {
      expect(createCustomerListFixture(scenarioId).scenarioId).toBe(scenarioId);
    }
    for (const scenarioId of CUSTOMER_CREATE_SCENARIOS) {
      expect(createCustomerCreateFixture(scenarioId).scenarioId).toBe(scenarioId);
    }
    for (const scenarioId of CUSTOMER_DETAIL_SCENARIOS) {
      expect(createCustomerDetailFixture(scenarioId).scenarioId).toBe(scenarioId);
    }
  });

  it('returns fresh, deeply frozen snapshots without time or random derivation', () => {
    const first = createCustomerDetailFixture('C-DETAIL-SUCCESS');
    const second = createCustomerDetailFixture('C-DETAIL-SUCCESS');

    expect(first).not.toBe(second);
    expect(first).toEqual(second);
    expect(Object.isFrozen(first)).toBe(true);
    if (first.kind === 'content') {
      expect(Object.isFrozen(first.order.route.stops)).toBe(true);
      expect(first.order.updatedAtLabel).toBe('14:32 · 15/08/2026');
    }
  });

  it('fails closed at permission boundaries without private order fields', () => {
    const list = createCustomerListFixture('C-LIST-PERMISSION');
    const create = createCustomerCreateFixture('C-NEW-PERMISSION');
    const detail = createCustomerDetailFixture('C-DETAIL-PERMISSION');

    expect(list.kind).toBe('permission-denied');
    expect(create.kind).toBe('permission-denied');
    expect(detail.kind).toBe('permission-denied');
    expect('orders' in list).toBe(false);
    expect('form' in create).toBe(false);
    expect('order' in detail).toBe(false);
  });

  it('never offers more than one primary action in a Customer snapshot', () => {
    for (const scenarioId of CUSTOMER_CREATE_SCENARIOS) {
      const fixture = createCustomerCreateFixture(scenarioId);
      if (fixture.kind === 'form') {
        expect(fixture.actions.filter((action) => action.emphasis === 'primary')).toHaveLength(1);
      }
    }

    for (const scenarioId of CUSTOMER_DETAIL_SCENARIOS) {
      const fixture = createCustomerDetailFixture(scenarioId);
      if (fixture.kind === 'content') {
        expect(
          fixture.actions.filter((action) => action.emphasis === 'primary').length,
        ).toBeLessThanOrEqual(1);
      }
    }
  });

  it('never offers create-order again after the order exists in the response snapshot', () => {
    const partial = createCustomerCreateFixture('C-NEW-CREATED-MEDIA-ERROR');
    const success = createCustomerCreateFixture('C-NEW-SUCCESS');

    expect(partial.kind).toBe('form');
    expect(success.kind).toBe('form');
    if (partial.kind === 'form' && success.kind === 'form') {
      expect(partial.actions.map((action) => action.id)).not.toContain('create-order');
      expect(success.actions.map((action) => action.id)).not.toContain('create-order');
    }
  });
});
