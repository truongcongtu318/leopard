import { describe, expect, it } from '@jest/globals';

import {
  createCustomerPreviewView,
  type CustomerPreviewScreen,
  type CustomerPreviewView,
} from './catalogue';

type RouteBoundCustomerPreviewFactory = (
  screen: CustomerPreviewScreen,
  requestedScenario: string | null,
  orderId: string | null,
) => CustomerPreviewView;

describe('Customer preview catalogue', () => {
  it('selects deterministic defaults per route', () => {
    expect(createCustomerPreviewView('list', null).scenarioId).toBe('C-LIST-SUCCESS');
    expect(createCustomerPreviewView('create', null).scenarioId).toBe('C-NEW-ESTIMATE-DEMO');
    expect(createCustomerPreviewView('detail', null).scenarioId).toBe('C-DETAIL-SUCCESS');
  });

  it('rejects a scenario from another screen or unknown input', () => {
    expect(() => createCustomerPreviewView('list', 'C-DETAIL-SUCCESS')).toThrow(
      'Unsupported Customer preview scenario',
    );
    expect(() => createCustomerPreviewView('detail', '__proto__')).toThrow(
      'Unsupported Customer preview scenario',
    );
  });

  it('binds immutable detail data and every order action to a known route ID', () => {
    const routeOrderId = '11111111-1111-4111-8111-111111111002';
    const createRouteBoundPreview =
      createCustomerPreviewView as RouteBoundCustomerPreviewFactory;
    const paymentView = createRouteBoundPreview(
      'detail',
      'C-DETAIL-PAYMENT-UNPAID',
      routeOrderId,
    );
    const cancelView = createRouteBoundPreview(
      'detail',
      'C-DETAIL-CANCEL-AVAILABLE',
      routeOrderId,
    );

    expect(paymentView.kind).toBe('content');
    expect(cancelView.kind).toBe('content');
    if (
      paymentView.kind === 'content' &&
      'order' in paymentView &&
      cancelView.kind === 'content' &&
      'order' in cancelView
    ) {
      expect(paymentView.order.id).toBe(routeOrderId);
      expect(paymentView.order.reference).toBe('LP-260815-002');
      expect(paymentView.order.payment.action).toMatchObject({ orderId: routeOrderId });
      expect(cancelView.order.id).toBe(routeOrderId);
      expect(cancelView.cancel).toMatchObject({
        action: { orderId: routeOrderId },
      });
      expect(Object.isFrozen(paymentView)).toBe(true);
      expect(Object.isFrozen(cancelView)).toBe(true);
    }
  });

  it('fails closed for a valid UUID that is absent from the Customer fixture catalogue', () => {
    const createRouteBoundPreview =
      createCustomerPreviewView as RouteBoundCustomerPreviewFactory;

    expect(() =>
      createRouteBoundPreview(
        'detail',
        'C-DETAIL-SUCCESS',
        '11111111-1111-4111-8111-111111111099',
      ),
    ).toThrow('Customer preview order is not available');
  });
});
