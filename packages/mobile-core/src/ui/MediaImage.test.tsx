import { describe, expect, it, jest } from '@jest/globals';
import { render, waitFor } from '@testing-library/react-native';
import React from 'react';

jest.mock('../api/http-client', () => ({
  httpClient: { get: jest.fn() },
}));

import { httpClient } from '../api/http-client';
import { MediaImage } from './MediaImage';

describe('MediaImage', () => {
  it('shows a loading state, then renders the image once the signed URL resolves', async () => {
    let resolvePromise: (value: { url: string; expiresAt: string }) => void;
    const promise = new Promise<{ url: string; expiresAt: string }>((res) => {
      resolvePromise = res;
    });
    (httpClient.get as jest.Mock<any>).mockReturnValue(promise);

    const screen = await render(<MediaImage mediaId="media-1" />);

    expect(screen.getByText('Đang tải ảnh…')).toBeTruthy();

    resolvePromise!({
      url: 'https://cdn.example.com/signed/photo.jpg',
      expiresAt: '2026-08-23T00:00:00.000Z',
    });

    await waitFor(() => {
      expect(httpClient.get).toHaveBeenCalledWith('/media/media-1/url');
      expect(screen.queryByText('Đang tải ảnh…')).toBeNull();
    });
    await screen.unmount();
  });

  it('shows an error state when the signed URL request fails', async () => {
    (httpClient.get as jest.Mock<any>).mockRejectedValue(new Error('not found'));

    const screen = await render(<MediaImage mediaId="media-missing" />);

    await waitFor(() => {
      expect(screen.getByText('Không thể tải ảnh')).toBeTruthy();
    });
    await screen.unmount();
  });
});
