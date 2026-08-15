import { describe, expect, it } from '@jest/globals';

import { FLEET_QUERY_CAPABILITIES } from './port';
import {
  FLEET_PREVIEW_SCENARIOS,
  createFleetPreviewView,
  type FleetPreviewScreen,
} from './fixtures';
import type { FleetScopeView } from './model';

const screenByScenario: Readonly<Record<string, FleetPreviewScreen>> = {
  'fleet-overview-success': 'dashboard',
  'fleet-overview-empty': 'dashboard',
  'fleet-overview-partial-error': 'dashboard',
  'fleet-scope-denied': 'dashboard',
  'fleet-scope-loading': 'dashboard',
  'fleet-drivers-mixed': 'drivers',
  'fleet-drivers-no-results': 'drivers',
  'fleet-drivers-map-unavailable': 'drivers',
  'fleet-orders-mixed': 'orders',
  'fleet-orders-no-results': 'orders',
  'fleet-orders-offline': 'orders',
  'fleet-orders-conflict': 'orders',
  'fleet-order-detail-success': 'order-detail',
  'fleet-order-detail-stale-tracking': 'order-detail',
  'fleet-order-detail-no-location': 'order-detail',
  'fleet-order-detail-media-error': 'order-detail',
  'fleet-order-foreign-denied': 'order-detail',
  'fleet-session-expired': 'dashboard',
  'fleet-reconnecting': 'dashboard',
  'fleet-refresh-success': 'dashboard',
};

describe('Fleet read-only fixture catalogue', () => {
  it('covers the 20 approved static scenarios', () => {
    expect(FLEET_PREVIEW_SCENARIOS).toHaveLength(20);
    expect(FLEET_PREVIEW_SCENARIOS).toEqual(Object.keys(screenByScenario));
  });

  it.each(FLEET_PREVIEW_SCENARIOS)('returns a fresh deep-frozen %s view', (scenarioId) => {
    const screen = screenByScenario[scenarioId];
    if (!screen) throw new Error(`Missing screen mapping for ${scenarioId}`);
    const first = createFleetPreviewView(screen, scenarioId);
    const second = createFleetPreviewView(screen, scenarioId);

    expect(first).toEqual(second);
    expect(first).not.toBe(second);
    expect(Object.isFrozen(first)).toBe(true);
    if ('scope' in first) {
      const scope = first.scope as FleetScopeView;
      expect(Object.isFrozen(scope)).toBe(true);
      expect(scope.readOnly).toBe(true);
      expect(scope.membershipStatus).toBe('ACTIVE');
    }
  });

  it('removes every private field from access-denied and expired states', () => {
    const denied = createFleetPreviewView('order-detail', 'fleet-order-foreign-denied');
    const expired = createFleetPreviewView('dashboard', 'fleet-session-expired');

    for (const view of [denied, expired]) {
      expect(view).not.toHaveProperty('scope');
      expect(view).not.toHaveProperty('order');
      expect(view).not.toHaveProperty('result');
      expect(view).not.toHaveProperty('metrics');
      expect(JSON.stringify(view)).not.toContain('Sao Mai');
      expect(JSON.stringify(view)).not.toContain('LP-F-');
    }
  });

  it('exposes query capabilities only and rejects mismatched scenarios', () => {
    expect(FLEET_QUERY_CAPABILITIES).toEqual([
      'readScope',
      'readDashboard',
      'readDrivers',
      'readOrders',
      'readOrderDetail',
      'subscribeToReadEvents',
    ]);
    expect(FLEET_QUERY_CAPABILITIES.join(' ')).not.toMatch(
      /create|update|delete|cancel|accept|confirm|invite|remove|upload|set/i,
    );
    expect(() => createFleetPreviewView('drivers', 'fleet-orders-mixed')).toThrow(
      'Unsupported Fleet preview scenario',
    );
  });
});
