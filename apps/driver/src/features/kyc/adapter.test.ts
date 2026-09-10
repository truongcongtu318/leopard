import { describe, expect, it, jest } from '@jest/globals';

import { createDriverKycHttpAdapter } from './adapter';

describe('createDriverKycHttpAdapter', () => {
  it('maps GET /driver/documents to display items with Vietnamese titles', async () => {
    const get = jest.fn(async () => [
      { id: 'd1', type: 'LICENSE', contentType: 'image/jpeg', url: '/files/x.jpg', createdAt: '2026-09-01T00:00:00.000Z' },
      { id: 'd2', type: 'VEHICLE_REGISTRATION', contentType: 'image/jpeg', url: '/files/y.jpg', createdAt: '2026-09-01T00:00:00.000Z' },
    ]);
    const adapter = createDriverKycHttpAdapter({ get: get as any });

    const docs = await adapter.listDocuments();

    expect(get).toHaveBeenCalledWith('/driver/documents');
    expect(docs).toEqual([
      expect.objectContaining({ id: 'd1', title: 'Giấy phép lái xe (GPLX)', url: '/files/x.jpg' }),
      expect.objectContaining({ id: 'd2', title: 'Giấy đăng ký xe (Cà vẹt)' }),
    ]);
  });

  it('rejects when the request fails', async () => {
    const get = jest.fn(async () => {
      throw new Error('network');
    });
    const adapter = createDriverKycHttpAdapter({ get: get as any });

    await expect(adapter.listDocuments()).rejects.toThrow('network');
  });
});
