import { describe, expect, it, jest } from '@jest/globals';

import { createCustomerProfileHttpAdapter, type ProfileHttpClient } from './adapter';

function makeClient(overrides: Partial<ProfileHttpClient> = {}): ProfileHttpClient {
  return { get: jest.fn() as any, post: jest.fn() as any, patch: jest.fn() as any, postForm: jest.fn() as any, ...overrides };
}

describe('createCustomerProfileHttpAdapter', () => {
  it('maps GET /me including name/email/avatarUrl', async () => {
    const get = jest.fn(async () => ({
      id: 'u1',
      phone: '0900000001',
      role: 'CUSTOMER',
      status: 'ACTIVE',
      name: 'Nguyễn Văn A',
      email: 'a@leopard.vn',
      avatarStorageKey: 'avatars/u1/x.jpg',
    }));
    const port = createCustomerProfileHttpAdapter(makeClient({ get: get as any }));

    const view = await port.getProfileView();

    expect(view).toMatchObject({
      kind: 'content',
      name: 'Nguyễn Văn A',
      email: 'a@leopard.vn',
      avatarUrl: expect.stringContaining('avatars/u1/x.jpg'),
    });
  });

  it('returns null name/email/avatarUrl when not set', async () => {
    const get = jest.fn(async () => ({
      id: 'u1', phone: '0900000001', role: 'CUSTOMER', status: 'ACTIVE',
      name: null, email: null, avatarStorageKey: null,
    }));
    const port = createCustomerProfileHttpAdapter(makeClient({ get: get as any }));

    const view = await port.getProfileView();

    expect(view).toMatchObject({ name: null, email: null, avatarUrl: null });
  });

  it('updateProfile calls PATCH /users/me with name/email and both consent flags true', async () => {
    const patch = jest.fn(async () => ({}));
    const port = createCustomerProfileHttpAdapter(makeClient({ patch: patch as any }));

    await port.updateProfile({ name: 'Tên mới', email: 'moi@leopard.vn' });

    expect(patch).toHaveBeenCalledWith('/users/me', {
      name: 'Tên mới',
      email: 'moi@leopard.vn',
      consentTerms: true,
      consentService: true,
    });
  });

  it('uploadAvatar posts multipart form data to /users/me/avatar', async () => {
    const postForm = jest.fn(async () => ({ avatarStorageKey: 'avatars/u1/new.jpg' }));
    const port = createCustomerProfileHttpAdapter(makeClient({ postForm: postForm as any }));

    const result = await port.uploadAvatar({ uri: 'file:///tmp/a.jpg', name: 'a.jpg', type: 'image/jpeg' });

    expect(postForm).toHaveBeenCalledWith('/users/me/avatar', expect.any(FormData));
    expect(result.avatarStorageKey).toBe('avatars/u1/new.jpg');
  });

  it('maps a DISABLED status to a danger tone', async () => {
    const get = jest.fn(async () => ({
      id: 'u1',
      phone: '0900000001',
      role: 'CUSTOMER',
      status: 'DISABLED',
      name: null,
      email: null,
      avatarStorageKey: null,
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
