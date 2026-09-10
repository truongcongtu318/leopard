import { describe, expect, it } from '@jest/globals';

import {
  createAdminPreviewHref,
  createOrderCommandView,
  createUserCommandView,
  deepFreeze,
  formatDateTime,
  formatDriverDisplayId,
  formatFleetDisplayId,
  formatMaskedPhone,
  formatOrderReference,
  formatTimeOnly,
  formatVndPrice,
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
    expect(
      parseAdminListFilters('drivers', { availability: 'ROOT', sort: 'revenue' }),
    ).toMatchObject({
      availability: 'ALL',
      sort: 'name-asc',
      page: 1,
      pageSize: 20,
    });
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

describe('Formatters and Utility Helpers', () => {
  it('formats VND prices correctly', () => {
    expect(formatVndPrice(420000)).toBe('420.000 ₫');
    expect(formatVndPrice(0)).toBe('0 ₫');
    expect(formatVndPrice(null)).toBe('0 ₫');
    expect(formatVndPrice(undefined)).toBe('0 ₫');
  });

  it('formats masked phone numbers safely', () => {
    expect(formatMaskedPhone('0909123456')).toBe('••• ••• 3456');
    expect(formatMaskedPhone(null)).toBe('••• ••• ••••');
    expect(formatMaskedPhone('')).toBe('••• ••• ••••');
    expect(formatMaskedPhone('123')).toBe('••• 123');
  });

  it('formats dates and time labels', () => {
    expect(formatDateTime('14:32 · 15/08/2026')).toBe('14:32 · 15/08/2026');
    expect(formatDateTime(null)).toBe('');
    expect(formatTimeOnly(null)).toBe('');
    expect(formatTimeOnly('invalid-date')).toBe('');
  });

  it('formats order reference, fleet display ID, and driver display ID', () => {
    expect(
      formatOrderReference({
        id: '33333333-3333-4333-8333-333333333101',
        reference: 'LP-A-260815-101',
      }),
    ).toBe('LP-A-260815-101');
    expect(
      formatOrderReference({
        id: '33333333-3333-4333-8333-333333333101',
      }),
    ).toBe('LP-A-260815-333');
    expect(
      formatFleetDisplayId({
        id: '11111111-1111-4111-8111-111111111001',
        displayId: 'FLEET-OPS-001',
      }),
    ).toBe('FLEET-OPS-001');
    expect(
      formatFleetDisplayId({
        id: '11111111-1111-4111-8111-111111111001',
      }),
    ).toBe('FLEET-1111');
    expect(
      formatDriverDisplayId({
        id: '22222222-2222-4222-8222-222222222001',
        displayId: 'DRV-SM-001',
      }),
    ).toBe('DRV-SM-001');
    expect(
      formatDriverDisplayId({
        id: '22222222-2222-4222-8222-222222222001',
      }),
    ).toBe('DRV-SM-222222');
  });

  it('deepFreezes nested objects and arrays', () => {
    const obj = { a: { b: 1 }, c: [{ d: 2 }, 3] };
    const frozen = deepFreeze(obj);
    expect(Object.isFrozen(frozen)).toBe(true);
    expect(Object.isFrozen(frozen.a)).toBe(true);
    expect(Object.isFrozen(frozen.c)).toBe(true);
    expect(Object.isFrozen(frozen.c[0])).toBe(true);
  });

  it('builds valid createUserCommandView schemas with reason policies', () => {
    const disableCmd = createUserCommandView('DISABLE_USER', {
      id: '55555555-5555-4555-8555-555555555001',
      displayName: 'Nguyễn An',
      role: 'DRIVER',
      status: 'ACTIVE',
      phone: '0909123456',
    });

    expect(disableCmd.kind).toBe('DISABLE_USER');
    expect(disableCmd.buttonVariant).toBe('destructive');
    expect(disableCmd.reasonPolicy.required).toBe(true);
    expect(disableCmd.reasonPolicy.minLength).toBe(5);
    expect(disableCmd.reasonPolicy.maxLength).toBe(500);
    expect(disableCmd.targetItems).toHaveLength(3);

    const enableCmd = createUserCommandView('ENABLE_USER', {
      id: '55555555-5555-4555-8555-555555555002',
      displayName: 'Trần Bình',
      role: 'CUSTOMER',
      status: 'DISABLED',
      phone: '0909567890',
    });

    expect(enableCmd.kind).toBe('ENABLE_USER');
    expect(enableCmd.buttonVariant).toBe('primary');
  });
});
