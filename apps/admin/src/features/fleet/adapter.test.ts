import { describe, expect, it } from '@jest/globals';

import {
  deepFreeze,
  fleetOrderDetailHref,
  fleetPreviewHref,
  formatDateTime,
  formatDriverDisplayId,
  formatOrderReference,
  formatTimeOnly,
  formatVndPrice,
  parseFleetDriverFilters,
  parseFleetOrderFilters,
  parseFleetOrderId,
  serializeFleetDriverFilters,
  serializeFleetOrderFilters,
} from './adapter';

describe('Fleet URL boundary', () => {
  it('allow-lists Driver filters and clamps pagination', () => {
    expect(
      parseFleetDriverFilters({
        q: ['  Tài xế mô phỏng  ', 'ignored'],
        availability: 'ROOT',
        sort: 'availability',
        page: '-2',
        pageSize: '999',
      }),
    ).toEqual({
      q: 'Tài xế mô phỏng',
      availability: 'ALL',
      sort: 'availability',
      page: 1,
      pageSize: 20,
    });
  });

  it('validates Order filters without reflecting unsafe values', () => {
    expect(
      parseFleetOrderFilters({
        q: '<script>alert(1)</script>',
        status: 'IN_TRANSIT',
        customer: '  Khách mô phỏng  ',
        driverId: 'not-a-uuid',
        from: '2026-02-31',
        to: '2026-08-15',
        sort: 'updated-asc',
        page: '3',
        pageSize: '50',
      }),
    ).toEqual({
      q: '<script>alert(1)</script>',
      status: 'IN_TRANSIT',
      customer: 'Khách mô phỏng',
      driverId: '',
      from: '',
      to: '2026-08-15',
      sort: 'updated-asc',
      page: 3,
      pageSize: 50,
    });
  });

  it('serializes canonical filters and preserves only explicit preview context', () => {
    const driverQuery = serializeFleetDriverFilters(
      {
        q: 'An',
        availability: 'AVAILABLE',
        sort: 'name-desc',
        page: 2,
        pageSize: 50,
      },
      { preview: 'enabled', scenario: 'fleet-drivers-mixed' },
    );
    const orderQuery = serializeFleetOrderFilters(
      {
        q: 'LP-001',
        status: 'ALL',
        customer: '',
        driverId: '',
        from: '',
        to: '',
        sort: 'updated-desc',
        page: 1,
        pageSize: 20,
      },
      { preview: 'enabled', scenario: 'fleet-orders-mixed' },
    );

    expect(driverQuery).toBe(
      'q=An&availability=AVAILABLE&sort=name-desc&page=2&pageSize=50&preview=enabled&scenario=fleet-drivers-mixed',
    );
    expect(orderQuery).toBe(
      'q=LP-001&status=ALL&sort=updated-desc&page=1&pageSize=20&preview=enabled&scenario=fleet-orders-mixed',
    );
  });

  it('adds preview context without corrupting existing query or hash state', () => {
    expect(
      fleetPreviewHref(
        '/fleet/orders/33333333-3333-4333-8333-333333333001?tab=tracking#history',
        'fleet-order-detail-success',
        { preview: 'enabled', scenario: 'fleet-orders-mixed' },
      ),
    ).toBe(
      '/fleet/orders/33333333-3333-4333-8333-333333333001?tab=tracking&preview=enabled&scenario=fleet-order-detail-success#history',
    );
  });

  it('accepts only canonical UUID route identifiers', () => {
    expect(parseFleetOrderId('33333333-3333-4333-8333-333333333001')).toBe(
      '33333333-3333-4333-8333-333333333001',
    );
    expect(parseFleetOrderId(['bad', '33333333-3333-4333-8333-333333333001'])).toBeNull();
    expect(parseFleetOrderId('../admin')).toBeNull();
  });

  it('uses safe defaults for missing, duplicate and invalid preview values', () => {
    expect(parseFleetDriverFilters({})).toEqual({
      q: '',
      availability: 'ALL',
      sort: 'name-asc',
      page: 1,
      pageSize: 20,
    });
    expect(parseFleetOrderFilters({ from: ['2026-08-15'], to: ['bad'] })).toMatchObject({
      from: '2026-08-15',
      to: '',
      status: 'ALL',
      sort: 'updated-desc',
    });
    expect(
      serializeFleetDriverFilters(
        { q: '', availability: 'ALL', sort: 'name-asc', page: 1, pageSize: 20 },
        { preview: 'enabled', scenario: '../unsafe' },
      ),
    ).toBe('availability=ALL&sort=name-asc&page=1&pageSize=20&preview=enabled');
    expect(
      serializeFleetOrderFilters({
        q: '',
        status: 'ALL',
        customer: '',
        driverId: '',
        from: '',
        to: '',
        sort: 'updated-desc',
        page: 1,
        pageSize: 20,
      }),
    ).not.toContain('preview');
  });
});

describe('Formatters and Utility Helpers', () => {
  it('formats VND prices correctly', () => {
    expect(formatVndPrice(420000)).toBe('420.000 ₫');
    expect(formatVndPrice(0)).toBe('0 ₫');
    expect(formatVndPrice(null)).toBe('0 ₫');
    expect(formatVndPrice(undefined)).toBe('0 ₫');
  });

  it('formats dates and time labels', () => {
    const formatted = formatDateTime('14:32 · 15/08/2026');
    expect(formatted).toBe('14:32 · 15/08/2026');
    expect(formatDateTime(null)).toBe('');
    expect(formatTimeOnly(null)).toBe('');
  });

  it('formats order reference and driver display ID', () => {
    expect(formatOrderReference({ id: '33333333-3333-4333-8333-333333333001', reference: 'LP-F-260815-001' })).toBe('LP-F-260815-001');
    expect(formatOrderReference({ id: '33333333-3333-4333-8333-333333333001' })).toBe('LP-F-33333333');
    expect(formatDriverDisplayId({ id: '22222222-2222-4222-8222-222222222001', displayId: 'DRV-SM-001' })).toBe('DRV-SM-001');
    expect(formatDriverDisplayId({ id: '22222222-2222-4222-8222-222222222001' })).toBe('DRV-SM-222222');
  });

  it('deepFreezes nested objects', () => {
    const obj = { a: { b: 1 }, c: [2, 3] };
    const frozen = deepFreeze(obj);
    expect(Object.isFrozen(frozen)).toBe(true);
    expect(Object.isFrozen(frozen.a)).toBe(true);
    expect(Object.isFrozen(frozen.c)).toBe(true);
  });
});
