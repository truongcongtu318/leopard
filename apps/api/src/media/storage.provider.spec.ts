import { afterEach, beforeEach, describe, expect, it } from '@jest/globals';

import { LocalStorageProvider } from './storage.provider';

describe('LocalStorageProvider.createReadUrl', () => {
  const provider = new LocalStorageProvider();
  const saved: Record<string, string | undefined> = {};

  // Snapshot inside beforeEach: capturing at describe time would record the
  // values from before the file ran, and restoring those would erase what each
  // test set.
  beforeEach(() => {
    saved.PUBLIC_FILES_BASE_URL = process.env.PUBLIC_FILES_BASE_URL;
    saved.API_URL = process.env.API_URL;
    delete process.env.PUBLIC_FILES_BASE_URL;
    delete process.env.API_URL;
  });

  afterEach(() => {
    for (const key of ['PUBLIC_FILES_BASE_URL', 'API_URL'] as const) {
      const value = saved[key];
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });

  it('returns a root-relative URL when the base is the same-origin marker', async () => {
    // The value the demo deploy uses: media stays on the client's own origin so
    // it is not blocked as mixed content over HTTPS. The empty base must not be
    // swallowed by the `||` fallback chain into the localhost default.
    process.env.PUBLIC_FILES_BASE_URL = '/';

    await expect(provider.createReadUrl('orders/1/proof.png')).resolves.toBe(
      '/files/orders/1/proof.png',
    );
  });

  it('takes the same-origin path even when an API origin is configured', async () => {
    process.env.PUBLIC_FILES_BASE_URL = '/';
    process.env.API_URL = 'http://api:3000/api/v1';

    await expect(provider.createReadUrl('orders/1/proof.png')).resolves.toBe(
      '/files/orders/1/proof.png',
    );
  });

  it('builds an absolute URL from an origin base', async () => {
    process.env.PUBLIC_FILES_BASE_URL = 'http://161.248.147.18:3000';

    await expect(provider.createReadUrl('orders/1/proof.png')).resolves.toBe(
      'http://161.248.147.18:3000/files/orders/1/proof.png',
    );
  });

  it('tolerates a trailing slash on an origin base', async () => {
    process.env.PUBLIC_FILES_BASE_URL = 'http://161.248.147.18:3000/';

    await expect(provider.createReadUrl('orders/1/proof.png')).resolves.toBe(
      'http://161.248.147.18:3000/files/orders/1/proof.png',
    );
  });

  it('falls back to the API origin when no base is configured', async () => {
    process.env.API_URL = 'http://api:3000/api/v1';

    await expect(provider.createReadUrl('orders/1/proof.png')).resolves.toBe(
      'http://api:3000/files/orders/1/proof.png',
    );
  });

  it('falls back to localhost when nothing is configured', async () => {
    await expect(provider.createReadUrl('orders/1/proof.png')).resolves.toBe(
      'http://localhost:3000/files/orders/1/proof.png',
    );
  });

  it('encodes each path segment', async () => {
    process.env.PUBLIC_FILES_BASE_URL = '/';

    await expect(provider.createReadUrl('orders/a b/proof.png')).resolves.toBe(
      '/files/orders/a%20b/proof.png',
    );
  });
});
