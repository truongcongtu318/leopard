import { describe, expect, it } from '@jest/globals';

import {
  createAdminPreviewHref,
  parseAdminCommandKind,
  parseAdminEntityId,
  parseAdminListFilters,
  serializeAdminListFilters,
} from './adapter';

describe('Admin URL and privacy boundary', () => {
  it('allow-lists Order filters and validates dates, IDs and pagination', () => {
    expect(
      parseAdminListFilters('orders', {
        q: '0909 123 456',
        status: 'IN_TRANSIT',
        customerId: '44444444-4444-4444-8444-444444444001',
        driverId: 'not-a-uuid',
        from: '2026-08-01',
        to: '2026-02-31',
        sort: 'updated-asc',
        page: '-1',
        pageSize: '100',
      }),
    ).toEqual({
      status: 'IN_TRANSIT',
      role: 'ALL',
      userStatus: 'ALL',
      availability: 'ALL',
      membershipStatus: 'ALL',
      fleetId: '',
      customerId: '44444444-4444-4444-8444-444444444001',
      driverId: '',
      from: '2026-08-01',
      to: '',
      sort: 'updated-asc',
      page: 1,
      pageSize: 100,
    });
  });

  it('drops raw search and unrelated fields from serialized URLs', () => {
    const query = serializeAdminListFilters(
      'users',
      {
        status: 'ALL',
        role: 'DRIVER',
        userStatus: 'DISABLED',
        availability: 'ALL',
        membershipStatus: 'ALL',
        fleetId: '',
        customerId: '',
        driverId: '',
        from: '',
        to: '',
        sort: 'updated-desc',
        page: 2,
        pageSize: 50,
      },
      {
        preview: 'enabled',
        scenario: 'ADM-USR-DENSE',
        rawSearch: '0909 123 456',
      },
    );

    expect(query).toBe(
      'role=DRIVER&userStatus=DISABLED&sort=updated-desc&page=2&pageSize=50&preview=enabled&scenario=ADM-USR-DENSE',
    );
    expect(query).not.toContain('0909');
    expect(query).not.toContain('rawSearch');
  });

  it('keeps only allow-listed preview context on navigation links', () => {
    const orderId = '33333333-3333-4333-8333-333333333104';

    expect(
      createAdminPreviewHref(
        `/admin/orders/${orderId}?q=0909123456&token=private-demo`,
        'order-detail',
        {
          preview: 'enabled',
          scenario: 'ADM-ORD-DENSE',
          command: 'CANCEL_ORDER',
          rawSearch: '0909 123 456',
        },
      ),
    ).toBe(`/admin/orders/${orderId}?preview=enabled&scenario=ADM-ORD-DETAIL`);

    expect(
      createAdminPreviewHref(`/admin/orders/${orderId}`, 'order-detail', {
        preview: 'enabled',
        scenario: 'ADM-CMD-INVALID',
        command: 'CANCEL_ORDER',
      }),
    ).toBe(
      `/admin/orders/${orderId}?preview=enabled&scenario=ADM-CMD-INVALID&command=CANCEL_ORDER`,
    );

    expect(
      createAdminPreviewHref('/admin/orders', 'orders', {
        preview: 'enabled',
        scenario: 'ADM-ORD-DENSE',
        rawSearch: 'customer@example.test',
      }),
    ).toBe('/admin/orders?preview=enabled&scenario=ADM-ORD-DENSE');
  });

  it('uses per-screen defaults for invalid or missing values', () => {
    expect(parseAdminListFilters('drivers', { availability: 'ROOT', sort: 'revenue' })).toMatchObject(
      {
        availability: 'ALL',
        sort: 'name-asc',
        page: 1,
        pageSize: 20,
      },
    );
    expect(parseAdminListFilters('fleets', {})).toMatchObject({ sort: 'name-asc' });
    expect(parseAdminListFilters('users', { role: 'ADMIN', userStatus: 'ACTIVE' })).toMatchObject({
      role: 'ADMIN',
      userStatus: 'ACTIVE',
    });
  });

  it('accepts only canonical UUIDs and command kinds', () => {
    expect(parseAdminEntityId('33333333-3333-4333-8333-333333333001')).toBe(
      '33333333-3333-4333-8333-333333333001',
    );
    expect(parseAdminEntityId(['bad', '33333333-3333-4333-8333-333333333001'])).toBeNull();
    expect(parseAdminCommandKind('CONFIRM_MANUAL_PAYMENT')).toBe('CONFIRM_MANUAL_PAYMENT');
    expect(parseAdminCommandKind('DELETE_FLEET')).toBeNull();
  });
});
