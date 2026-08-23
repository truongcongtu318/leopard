import { describe, expect, it, jest } from '@jest/globals';

import { createDriverProfileHttpAdapter, type ProfileHttpClient } from './adapter';

function makeClient(overrides: Partial<ProfileHttpClient> = {}): ProfileHttpClient {
  return { get: jest.fn() as any, post: jest.fn() as any, ...overrides };
}

describe('createDriverProfileHttpAdapter', () => {
  it('maps GET /me to a content view with a Vietnamese role/status label', async () => {
    const get = jest.fn(async () => ({
      id: 'u1',
      phone: '0900000002',
      role: 'DRIVER',
      status: 'ACTIVE',
    }));
    const port = createDriverProfileHttpAdapter(makeClient({ get: get as any }));

    const view = await port.getProfileView();

    expect(get).toHaveBeenCalledWith('/me');
    expect(view).toMatchObject({
      kind: 'content',
      phone: '0900000002',
      roleLabel: 'Tài xế',
      statusLabel: 'Đang hoạt động',
      statusTone: 'active',
    });
  });

  it('returns an error view when the profile request fails', async () => {
    const get = jest.fn(async () => {
      throw new Error('network down');
    });
    const port = createDriverProfileHttpAdapter(makeClient({ get: get as any }));

    const view = await port.getProfileView();

    expect(view.kind).toBe('error');
  });

  it('logout calls POST /auth/logout and never throws', async () => {
    const post = jest.fn(async () => {
      throw new Error('server unreachable');
    });
    const port = createDriverProfileHttpAdapter(makeClient({ post: post as any }));

    await expect(port.logout()).resolves.toBeUndefined();
    expect(post).toHaveBeenCalledWith('/auth/logout');
  });
});
