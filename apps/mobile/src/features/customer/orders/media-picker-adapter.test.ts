import { describe, expect, it, jest } from '@jest/globals';

jest.mock('../../../media/device-image-picker', () => ({
  pickDeviceImage: jest.fn(),
}));

import { pickDeviceImage } from '../../../media/device-image-picker';
import { createCustomerMediaPickerAdapter } from './media-picker-adapter';
import type { CustomerHttpClient } from './adapter';

describe('createCustomerMediaPickerAdapter', () => {
  function makeClient(overrides: Partial<CustomerHttpClient> = {}): CustomerHttpClient {
    return { get: jest.fn() as any, post: jest.fn() as any, postForm: jest.fn() as any, put: jest.fn() as any, delete: jest.fn() as any, ...overrides };
  }

  it('pickCargoImage delegates to pickDeviceImage', async () => {
    (pickDeviceImage as jest.Mock<any>).mockResolvedValue({
      uri: 'file:///x.jpg',
      name: 'x.jpg',
      mimeType: 'image/jpeg',
      size: 1024,
    });
    const port = createCustomerMediaPickerAdapter(makeClient());

    const result = await port.pickCargoImage();

    expect(result?.name).toBe('x.jpg');
  });

  it('uploadCargoImage posts multipart form data to orders/:id/media/cargo and returns available media view', async () => {
    (pickDeviceImage as jest.Mock<any>).mockResolvedValue({
      uri: 'file:///x.jpg',
      name: 'x.jpg',
      mimeType: 'image/jpeg',
      size: 1024,
    });
    const postForm = jest.fn(async () => ({ id: 'media-9', orderId: 'o1', type: 'CARGO' }));
    const client = makeClient({ postForm } as unknown as Partial<CustomerHttpClient>);
    const port = createCustomerMediaPickerAdapter(client);

    await port.pickCargoImage();
    const media = await port.uploadCargoImage('11111111-1111-4111-8111-111111111001');

    expect(postForm).toHaveBeenCalledWith(
      '/orders/11111111-1111-4111-8111-111111111001/media/cargo',
      expect.any(FormData),
    );
    expect(media.kind).toBe('available');
    expect(media.mediaId).toBe('media-9');
  });

  it('uploadCargoImage returns an error view when no file was picked first', async () => {
    const port = createCustomerMediaPickerAdapter(makeClient());

    const media = await port.uploadCargoImage('11111111-1111-4111-8111-111111111001');

    expect(media.kind).toBe('error');
  });
});
