import { describe, expect, it } from '@jest/globals';

import {
  createDriverPreviewView,
  type DriverPreviewScreen,
  type DriverPreviewView,
} from './catalogue';

type RouteBoundDriverPreviewFactory = (
  screen: DriverPreviewScreen,
  requestedScenario: string | null,
  orderId: string | null,
) => DriverPreviewView;

describe('Driver preview catalogue', () => {
  it('uses action-first defaults for list and detail', () => {
    expect(createDriverPreviewView('list', null).scenarioId).toBe('D-LIST-ACTIVE-REQUESTED');
    expect(createDriverPreviewView('detail', null).scenarioId).toBe('D-DETAIL-PROOF-REQUIRED');
  });

  it('rejects unknown and cross-screen scenarios', () => {
    expect(() => createDriverPreviewView('list', 'D-DETAIL-PROOF-REQUIRED')).toThrow(
      'Unsupported Driver preview scenario',
    );
    expect(() => createDriverPreviewView('detail', '__proto__')).toThrow(
      'Unsupported Driver preview scenario',
    );
  });

  it('binds immutable assigned detail and command identity to the exact route ID', () => {
    const routeOrderId = '22222222-2222-4222-8222-222222222001';
    const createRouteBoundPreview = createDriverPreviewView as RouteBoundDriverPreviewFactory;
    const view = createRouteBoundPreview('detail', 'D-DETAIL-READY-DELIVER', routeOrderId);

    expect(view.kind).toBe('content');
    if (view.kind === 'content' && 'order' in view) {
      expect(view.order.id).toBe(routeOrderId);
      expect(view.primaryTask?.command).toMatchObject({ orderId: routeOrderId });
      expect(view.offeredLifecycleCommand).toMatchObject({ orderId: routeOrderId });
      expect(Object.isFrozen(view)).toBe(true);
    }
  });

  it('selects a privacy-safe public default for a known requested order', () => {
    const createRouteBoundPreview = createDriverPreviewView as RouteBoundDriverPreviewFactory;
    const routeOrderId = '22222222-2222-4222-8222-222222222101';
    const view = createRouteBoundPreview('detail', null, routeOrderId);

    expect(view).toMatchObject({
      kind: 'content',
      accessScope: 'PUBLIC_SUMMARY',
      order: { id: routeOrderId, reference: 'LP-D-260815-101' },
    });
  });

  it('fails closed for a valid UUID that is absent from the Driver fixture catalogue', () => {
    const createRouteBoundPreview = createDriverPreviewView as RouteBoundDriverPreviewFactory;

    expect(() =>
      createRouteBoundPreview(
        'detail',
        'D-DETAIL-PROOF-REQUIRED',
        '22222222-2222-4222-8222-222222222099',
      ),
    ).toThrow('Driver preview order is not available');
  });
});
