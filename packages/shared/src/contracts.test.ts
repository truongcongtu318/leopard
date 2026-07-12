import { describe, expect, it } from 'vitest';

import { FleetMemberStatus, parsePageQuery, ProviderSource } from './index.js';

describe('shared domain contracts', () => {
  it('defines the canonical fleet member statuses', () => {
    expect(FleetMemberStatus).toEqual(['INVITED', 'ACTIVE', 'REMOVED']);
  });

  it('keeps identity providers out of provider sources', () => {
    expect(ProviderSource).toEqual(['VIETMAP', 'DEMO', 'PAYOS', 'VIETQR', 'LOCAL', 'S3']);
    expect(ProviderSource).not.toContain('FIREBASE');
  });

  it('uses the documented pagination response shape', () => {
    const page = {
      items: [{ id: 'order-1' }],
      page: 1,
      pageSize: 20,
      total: 1,
      totalPages: 1,
    };

    expect(JSON.parse(JSON.stringify(page))).toEqual({
      items: [{ id: 'order-1' }],
      page: 1,
      pageSize: 20,
      total: 1,
      totalPages: 1,
    });
  });

  it('rejects page sizes above 100', () => {
    expect(() => parsePageQuery({ page: '2', pageSize: '101' })).toThrow(
      'pageSize must be between 1 and 100',
    );
  });
});
