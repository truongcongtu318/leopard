import { describe, expect, it, jest } from '@jest/globals';

import { createCustomerProfileHttpAdapter, type ProfileHttpClient } from './adapter';

function makeClient(overrides: Partial<ProfileHttpClient> = {}): ProfileHttpClient {
  return { get: jest.fn() as any, post: jest.fn() as any, ...overrides };
}

describe('createCustomerProfileHttpAdapter', () => {
  it('maps GET /me to a content view with a Vietnamese role/status label', async () => {
    const get = jest.fn(async () => ({
      id: 'u1',
      phone: '0900000001',
      role: 'CUSTOMER',
      status: 'ACTIVE',
    }));
    const port = createCustomerProfileHttpAdapter(makeClient({ get: get as any }));

    const view = await port.getProfileView();

    expect(get).toHaveBeenCalledWith('/me');
    expect(view).toMatchObject({
      kind: 'content',
      phone: '0900000001',
      roleLabel: 'Khách hàng',
      statusLabel: 'Đang hoạt động',
      statusTone: 'active',
    });
  });

  it('maps a DISABLED status to a danger tone', async () => {
    const get = jest.fn(async () => ({
      id: 'u1',
      phone: '0900000001',
      role: 'CUSTOMER',
      status: 'DISABLED',
    }));
    const port = createCustomerProfileHttpAdapter(makeClient({ get: get as any }));

    const view = await port.getProfileView();

    expect(view).toMatchObject({ statusLabel: 'Đã vô hiệu hóa', statusTone: 'danger' });
  });

  it('returns an error view when the profile request fails', async () => {
    const get = jest.fn(async () => {
      throw new Error('network down');
    });
    const port = createCustomerProfileHttpAdapter(makeClient({ get: get as any }));

    const view = await port.getProfileView();

    expect(view.kind).toBe('error');
  });

  it('logout calls POST /auth/logout', async () => {
    const post = jest.fn(async () => undefined);
    const port = createCustomerProfileHttpAdapter(makeClient({ post: post as any }));

    await port.logout();

    expect(post).toHaveBeenCalledWith('/auth/logout');
  });

  it('logout does not throw even when the API call fails, so the client can always clear its session', async () => {
    const post = jest.fn(async () => {
      throw new Error('server unreachable');
    });
    const port = createCustomerProfileHttpAdapter(makeClient({ post: post as any }));

    await expect(port.logout()).resolves.toBeUndefined();
  });
});
