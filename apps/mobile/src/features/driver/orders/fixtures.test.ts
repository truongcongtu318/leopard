import { describe, expect, it } from '@jest/globals';

import {
  DRIVER_DETAIL_SCENARIOS,
  DRIVER_LIST_SCENARIOS,
  createDriverDetailFixture,
  createDriverListFixture,
} from './fixtures';

describe('Driver Wave 4 fixtures', () => {
  it('covers the approved list and detail catalogue with deterministic snapshots', () => {
    expect(DRIVER_LIST_SCENARIOS).toHaveLength(10);
    expect(DRIVER_DETAIL_SCENARIOS).toHaveLength(22);
    for (const scenarioId of DRIVER_LIST_SCENARIOS) {
      expect(createDriverListFixture(scenarioId).scenarioId).toBe(scenarioId);
    }
    for (const scenarioId of DRIVER_DETAIL_SCENARIOS) {
      expect(createDriverDetailFixture(scenarioId).scenarioId).toBe(scenarioId);
    }
  });

  it('returns fresh deeply frozen views and fixed timestamps', () => {
    const first = createDriverDetailFixture('D-DETAIL-PROOF-REQUIRED');
    const second = createDriverDetailFixture('D-DETAIL-PROOF-REQUIRED');
    expect(first).not.toBe(second);
    expect(first).toEqual(second);
    expect(Object.isFrozen(first)).toBe(true);
    if (first.kind === 'content' && first.accessScope === 'ASSIGNED_FULL') {
      expect(Object.isFrozen(first.order.route.stops)).toBe(true);
      expect(first.order.updatedAtLabel).toBe('14:32 · 15/08/2026');
    }
  });

  it('keeps public and permission views free of assigned private fields', () => {
    const list = createDriverListFixture('D-LIST-REQUESTED');
    const detail = createDriverDetailFixture('D-DETAIL-PUBLIC-REQUESTED');
    const denied = createDriverDetailFixture('D-DETAIL-PERMISSION');

    expect(list.kind).toBe('content');
    if (list.kind === 'content') {
      expect('route' in list.requestedOrders[0]).toBe(false);
      expect('customerContact' in list.requestedOrders[0]).toBe(false);
    }
    expect(detail.kind).toBe('content');
    if (detail.kind === 'content') {
      expect(detail.accessScope).toBe('PUBLIC_SUMMARY');
      expect('route' in detail.order).toBe(false);
      expect('customerContact' in detail.order).toBe(false);
    }
    expect(denied.kind).toBe('permission-denied');
    expect('order' in denied).toBe(false);
  });

  it('provides exactly one primary task and never invents DELIVERED before proof persists', () => {
    const proofRequired = createDriverDetailFixture('D-DETAIL-PROOF-REQUIRED');
    const ready = createDriverDetailFixture('D-DETAIL-READY-DELIVER');
    if (proofRequired.kind === 'content' && ready.kind === 'content') {
      expect(proofRequired.primaryTask?.kind).toBe('upload-proof');
      expect(proofRequired.offeredLifecycleCommand).toBeNull();
      expect(ready.primaryTask?.kind).toBe('advance-lifecycle');
      expect(ready.offeredLifecycleCommand?.targetStatus).toBe('DELIVERED');
      expect(ready.proof.kind).toBe('persisted');
    }
  });

  it('uses explicit availability capabilities and removes commands for terminal orders', () => {
    const empty = createDriverListFixture('D-LIST-EMPTY');
    const delivered = createDriverDetailFixture('D-DETAIL-TERMINAL-DELIVERED');
    if (empty.kind === 'content') {
      expect(empty.availability.status).toBe('OFFLINE');
      expect(empty.availability.action?.target).toBe('AVAILABLE');
    }
    if (delivered.kind === 'content') {
      expect(delivered.primaryTask).toBeNull();
      expect(delivered.offeredLifecycleCommand).toBeNull();
    }
  });
});
