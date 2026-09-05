import { describe, expect, it, jest } from '@jest/globals';

import { createDriverProfileHttpAdapter, type ProfileHttpClient } from './adapter';

function makeClient(overrides: Partial<ProfileHttpClient> = {}): ProfileHttpClient {
  return { get: jest.fn() as any, post: jest.fn() as any, patch: jest.fn() as any, postForm: jest.fn() as any, ...overrides };
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

  it('maps name/avatarUrl/vehicleLabel from /me and /driver/application', async () => {
    const get = jest.fn((path: string) => {
      if (path === '/me') {
        return Promise.resolve({
          id: 'u1', phone: '0900000002', role: 'DRIVER', status: 'ACTIVE',
          name: 'Trần Tài Xế', email: null, avatarStorageKey: null,
        });
      }
      if (path === '/driver/application') {
        return Promise.resolve({
          status: 'ACTIVE', vehicleType: 'TRUCK', licensePlate: '29H-123.45',
          licenseNumber: 'X', submittedAt: null, reviewedAt: null, rejectionReason: null,
        });
      }
      throw new Error(`unexpected path ${path}`);
    });
    const port = createDriverProfileHttpAdapter(makeClient({ get: get as any }));

    const view = await port.getProfileView();

    expect(view).toMatchObject({
      name: 'Trần Tài Xế',
      vehicleLabel: 'Xe tải · 29H-123.45',
    });
  });
});
