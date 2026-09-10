import { describe, expect, it } from '@jest/globals';

import {
  ADMIN_PREVIEW_SCENARIOS,
  createAdminPreviewView,
  type AdminPreviewScreen,
} from './fixtures';
import { ADMIN_OPERATIONS_CAPABILITIES } from './port';

const screenByScenario: Readonly<Record<string, AdminPreviewScreen>> = {
  'ADM-OV-READY': 'overview',
  'ADM-OV-READINESS': 'overview',
  'ADM-OV-OFFLINE': 'overview',
  'ADM-ORD-DENSE': 'orders',
  'ADM-ORD-NORESULT': 'orders',
  'ADM-ORD-DETAIL': 'order-detail',
  'ADM-TRK-STALE': 'order-detail',
  'ADM-MEDIA-ERROR': 'order-detail',
  'ADM-PAY-FAILED': 'order-detail',
  'ADM-USR-DENSE': 'users',
  'ADM-FLT-EMPTY': 'fleets',
  'ADM-DRV-MIXED': 'drivers',
  'ADM-CMD-INVALID': 'order-detail',
  'ADM-CMD-PENDING': 'order-detail',
  'ADM-CMD-ERROR': 'order-detail',
  'ADM-CMD-CONFLICT': 'order-detail',
  'ADM-CMD-SUCCESS': 'order-detail',
  'ADM-DENIED': 'overview',
  'ADM-EXPIRED': 'overview',
};

describe('Admin immutable scenario catalogue', () => {
  it('contains the 19 approved Admin scenarios', () => {
    expect(ADMIN_PREVIEW_SCENARIOS).toHaveLength(19);
    expect(ADMIN_PREVIEW_SCENARIOS).toEqual(Object.keys(screenByScenario));
  });

  it.each(ADMIN_PREVIEW_SCENARIOS)('returns a fresh deep-frozen %s view', (scenarioId) => {
    const screen = screenByScenario[scenarioId];
    if (!screen) throw new Error(`Missing screen mapping for ${scenarioId}`);
    const first = createAdminPreviewView(screen, scenarioId);
    const second = createAdminPreviewView(screen, scenarioId);

    expect(first).toEqual(second);
    expect(first).not.toBe(second);
    expect(Object.isFrozen(first)).toBe(true);
  });

  it('scrubs every private descendant from denied and expired views', () => {
    for (const scenario of ['ADM-DENIED', 'ADM-EXPIRED'] as const) {
      const view = createAdminPreviewView('order-detail', scenario);
      expect(view).not.toHaveProperty('order');
      expect(view).not.toHaveProperty('result');
      expect(view).not.toHaveProperty('audit');
      expect(view).not.toHaveProperty('availableCommands');
      expect(JSON.stringify(view)).not.toContain('LP-A-');
      expect(JSON.stringify(view)).not.toContain('Khách Hàng');
    }
  });

  it('keeps mutations capability-driven and excludes Fleet lifecycle commands', () => {
    expect(ADMIN_OPERATIONS_CAPABILITIES).toEqual([
      'readOverview',
      'readOrders',
      'readOrderDetail',
      'readUsers',
      'readFleets',
      'readDrivers',
      'executeAuditedCommand',
      'subscribeToReadEvents',
    ]);
    const fleets = createAdminPreviewView('fleets', 'ADM-FLT-EMPTY');
    expect(JSON.stringify(fleets)).not.toMatch(/create|disable|remove|invite/i);
    expect(() => createAdminPreviewView('drivers', 'ADM-ORD-DENSE')).toThrow(
      'Unsupported Admin preview scenario',
    );
  });

  it('models command success as a persisted scenario with an audit receipt', () => {
    const view = createAdminPreviewView(
      'order-detail',
      'ADM-CMD-SUCCESS',
      'CONFIRM_MANUAL_PAYMENT',
    );
    expect(view).toMatchObject({
      kind: 'order-detail',
      dialogPreview: {
        state: 'success',
        commandKind: 'CONFIRM_MANUAL_PAYMENT',
      },
    });
    if (view.kind !== 'order-detail') throw new Error('Expected detail view');
    expect(view.audit.entries[0]?.requestId).toBe('req-admin-demo-009');
    expect(view.order.payment.status).toBe('PAID_MANUAL');
  });

  it('binds order detail, command targets and audit targets to the requested catalogue order', () => {
    const orderId = '33333333-3333-4333-8333-333333333104';
    const view = createAdminPreviewView('order-detail', 'ADM-ORD-DETAIL', null, orderId);
    if (view.kind !== 'order-detail') throw new Error('Expected detail view');

    expect(view.order).toMatchObject({
      id: orderId,
      reference: 'LP-A-260815-104',
      status: 'IN_TRANSIT',
    });

    const cancel = view.availableCommands.find((item) => item.kind === 'CANCEL_ORDER');
    const payment = view.availableCommands.find(
      (item) => item.kind === 'CONFIRM_MANUAL_PAYMENT',
    );
    expect(cancel).toMatchObject({
      targetId: orderId,
      targetLabel: 'Đơn LP-A-260815-104',
      targetItems: expect.arrayContaining([
        expect.objectContaining({ id: 'order-id', value: orderId }),
      ]),
    });
    expect(payment).toMatchObject({
      targetId: view.order.payment.id,
      targetLabel: expect.stringContaining('LP-A-260815-104'),
      targetItems: expect.arrayContaining([
        expect.objectContaining({ id: 'order-id', value: orderId }),
      ]),
    });
    expect(view.audit.entries).not.toHaveLength(0);
    for (const entry of view.audit.entries) {
      expect(entry.targetLabel).toContain('LP-A-260815-104');
      expect(entry.targetLabel).toContain(orderId);
    }
  });

  it('fails closed when a valid UUID is not present in the preview order catalogue', () => {
    expect(() =>
      createAdminPreviewView(
        'order-detail',
        'ADM-ORD-DETAIL',
        null,
        '99999999-9999-4999-8999-999999999999',
      ),
    ).toThrow('Preview order is not available');
  });

  it('binds user commands and persisted results to the exact capability target', () => {
    const invalidEnable = createAdminPreviewView('users', 'ADM-CMD-INVALID', 'ENABLE_USER');
    if (invalidEnable.kind !== 'list') throw new Error('Expected Users list');
    const disabledUser = invalidEnable.result.items.find(
      (item) => item.entity === 'user' && item.status === 'DISABLED',
    );
    if (!disabledUser || disabledUser.entity !== 'user') throw new Error('Expected disabled user');
    expect(disabledUser.availableCommands[0]).toMatchObject({
      kind: 'ENABLE_USER',
      targetId: disabledUser.id,
      targetLabel: 'Người dùng Trần Bình Mô Phỏng',
      targetItems: expect.arrayContaining([
        expect.objectContaining({ id: 'role', value: 'CUSTOMER' }),
      ]),
    });

    const success = createAdminPreviewView('users', 'ADM-CMD-SUCCESS', 'ENABLE_USER');
    if (success.kind !== 'list') throw new Error('Expected Users list');
    expect(
      success.result.items.find((item) => item.id === disabledUser.id),
    ).toMatchObject({ status: 'ACTIVE' });
  });
});
