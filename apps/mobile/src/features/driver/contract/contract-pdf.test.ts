import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { Linking } from 'react-native';

import { openDriverContractPdf } from './contract-pdf';

/**
 * `GET /driver/contract/pdf` is auth-guarded (AccessTokenGuard + RoleGuard),
 * so a bare `Linking.openURL(pdfUrl)` would 401 — these tests pin down that
 * the helper always fetches through an authenticated request instead of
 * opening the relative path directly.
 */
class MockFileReader {
  result: string | null = null;
  onloadend: (() => void) | null = null;
  onerror: (() => void) | null = null;

  readAsDataURL(): void {
    this.result = 'data:application/pdf;base64,ZmFrZS1wZGY=';
    this.onloadend?.();
  }
}

describe('openDriverContractPdf', () => {
  const originalFetch = globalThis.fetch;
  const originalFileReader = (globalThis as { FileReader?: unknown }).FileReader;

  beforeEach(() => {
    (globalThis as { FileReader?: unknown }).FileReader = MockFileReader;
    Linking.openURL = jest.fn<typeof Linking.openURL>().mockResolvedValue(true);
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    (globalThis as { FileReader?: unknown }).FileReader = originalFileReader;
  });

  it('fetches the PDF with an absolute URL and a bearer token, then opens it', async () => {
    const blob = new Blob(['%PDF-1.4'], { type: 'application/pdf' });
    globalThis.fetch = jest.fn<typeof fetch>().mockResolvedValue({
      ok: true,
      status: 200,
      blob: () => Promise.resolve(blob),
    } as Response);

    await openDriverContractPdf('/driver/contract/pdf?version=v1', 'access-token-123');

    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/driver/contract/pdf?version=v1'),
      { headers: { Authorization: 'Bearer access-token-123' } },
    );
    expect(Linking.openURL).toHaveBeenCalledWith('data:application/pdf;base64,ZmFrZS1wZGY=');
  });

  it('omits the Authorization header when there is no access token', async () => {
    const blob = new Blob(['%PDF-1.4'], { type: 'application/pdf' });
    globalThis.fetch = jest.fn<typeof fetch>().mockResolvedValue({
      ok: true,
      status: 200,
      blob: () => Promise.resolve(blob),
    } as Response);

    await openDriverContractPdf('/driver/contract/pdf?version=v1', null);

    expect(globalThis.fetch).toHaveBeenCalledWith(expect.any(String), { headers: {} });
  });

  it('throws and never opens anything when the response is not OK (e.g. 401)', async () => {
    globalThis.fetch = jest.fn<typeof fetch>().mockResolvedValue({
      ok: false,
      status: 401,
      blob: () => Promise.resolve(new Blob()),
    } as Response);

    await expect(
      openDriverContractPdf('/driver/contract/pdf?version=v1', null),
    ).rejects.toThrow();
    expect(Linking.openURL).not.toHaveBeenCalled();
  });
});
