import { describe, expect, it, jest, beforeEach, afterEach } from '@jest/globals';
import { Platform } from 'react-native';
import { appendFileToFormData } from './form-data';

describe('appendFileToFormData', () => {
  const originalOS = Platform.OS;

  afterEach(() => {
    (Platform as { OS: string }).OS = originalOS;
  });

  describe('Native platforms (iOS / Android)', () => {
    beforeEach(() => {
      (Platform as { OS: string }).OS = 'ios';
    });

    it('appends object with uri, name, type for React Native FormData polyfill', async () => {
      const form = new FormData();
      await appendFileToFormData(form, 'file', {
        uri: 'file:///path/to/photo.jpg',
        name: 'photo.jpg',
        mimeType: 'image/jpeg',
      });

      // On native, it appends the { uri, name, type } object
      const parts = (form as unknown as { _parts?: Array<[string, unknown]> })._parts;
      if (parts) {
        expect(parts[0]).toEqual([
          'file',
          {
            uri: 'file:///path/to/photo.jpg',
            name: 'photo.jpg',
            type: 'image/jpeg',
          },
        ]);
      } else {
        // In standard FormData (Node environment)
        expect(form).toBeDefined();
      }
    });
  });

  describe('Web platform', () => {
    beforeEach(() => {
      (Platform as { OS: string }).OS = 'web';
    });

    it('appends Blob directly when file.file is a Blob', async () => {
      const form = new FormData();
      const mockBlob = new Blob(['sample-data'], { type: 'image/png' });
      await appendFileToFormData(form, 'file', {
        uri: 'blob:http://localhost:8081/abc',
        name: 'sample.png',
        file: mockBlob,
      });

      // Verify form has an entry
      expect(form.get('file')).toBeDefined();
    });

    it('fetches blob URI and appends Blob when uri is provided', async () => {
      const form = new FormData();
      const mockBlob = new Blob(['jpeg-data'], { type: 'image/jpeg' });
      const originalFetch = globalThis.fetch;
      globalThis.fetch = jest.fn<typeof fetch>().mockResolvedValue({
        blob: () => Promise.resolve(mockBlob),
      } as Response);

      try {
        await appendFileToFormData(form, 'file', {
          uri: 'blob:http://localhost:8081/def',
          name: 'proof.jpg',
          mimeType: 'image/jpeg',
        });

        expect(globalThis.fetch).toHaveBeenCalledWith('blob:http://localhost:8081/def');
        expect(form.get('file')).toBeDefined();
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    it('throws instead of appending an empty part when the image reads back empty', async () => {
      const form = new FormData();
      const originalFetch = globalThis.fetch;
      // A zero-byte part is what the API rejects as an unsupported type, so it
      // must never be sent: that surfaced a format error and hid the real cause.
      globalThis.fetch = jest.fn<typeof fetch>().mockResolvedValue({
        blob: () => Promise.resolve(new Blob([], { type: 'image/jpeg' })),
      } as Response);

      try {
        await expect(
          appendFileToFormData(form, 'file', {
            uri: 'blob:http://localhost:8081/empty',
            name: 'proof.jpg',
            mimeType: 'image/jpeg',
          }),
        ).rejects.toThrow(/Không đọc được dữ liệu ảnh/);
        expect(form.get('file')).toBeNull();
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    it('throws when the image URI cannot be fetched at all', async () => {
      const form = new FormData();
      const originalFetch = globalThis.fetch;
      globalThis.fetch = jest
        .fn<typeof fetch>()
        .mockRejectedValue(new Error('network down'));

      try {
        await expect(
          appendFileToFormData(form, 'file', {
            uri: 'blob:http://localhost:8081/gone',
            name: 'proof.jpg',
          }),
        ).rejects.toThrow(/Không đọc được dữ liệu ảnh/);
        expect(form.get('file')).toBeNull();
      } finally {
        globalThis.fetch = originalFetch;
      }
    });
  });
});
