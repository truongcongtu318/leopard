import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import * as SecureStore from 'expo-secure-store';

jest.mock('expo-secure-store', () => ({
  setItemAsync: jest.fn(),
  getItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
  isAvailableAsync: jest.fn(),
}));

import { SessionStore } from './session-store';

interface SecureStoreMocks {
  setItemAsync: jest.Mock<(key: string, value: string) => Promise<void>>;
  getItemAsync: jest.Mock<(key: string) => Promise<string | null>>;
  deleteItemAsync: jest.Mock<(key: string) => Promise<void>>;
  isAvailableAsync: jest.Mock<() => Promise<boolean>>;
}

function secureMocks(): SecureStoreMocks {
  return SecureStore as unknown as SecureStoreMocks;
}

const REFRESH_KEY = 'leopard.refresh';
const ROLE_KEY = 'leopard.role';

function makeSessionStore(): SessionStore {
  return new SessionStore();
}

describe('SessionStore', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    secureMocks().isAvailableAsync.mockResolvedValue(true);
    secureMocks().getItemAsync.mockResolvedValue(null);
    secureMocks().setItemAsync.mockResolvedValue(undefined);
    secureMocks().deleteItemAsync.mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // ---- memory-only access token ----

  it('stores access token in memory only while persisting refresh token and role', async () => {
    const store = makeSessionStore();
    await store.setSession('acc-123', 'ref-456', 'CUSTOMER');

    const accessToken = store.getAccessToken();
    expect(accessToken).toBe('acc-123');

    // SecureStore receives refresh token and role, NEVER the access token
    expect(secureMocks().setItemAsync).toHaveBeenCalledWith(REFRESH_KEY, 'ref-456');
    expect(secureMocks().setItemAsync).toHaveBeenCalledWith(ROLE_KEY, 'CUSTOMER');
    expect(secureMocks().setItemAsync).not.toHaveBeenCalledWith(expect.anything(), 'acc-123');
  });

  it('getAccessToken returns null when no session is set', () => {
    const store = makeSessionStore();
    expect(store.getAccessToken()).toBeNull();
  });

  it('getAccessToken returns null after clear', async () => {
    const store = makeSessionStore();
    await store.setSession('acc-123', 'ref-456', 'CUSTOMER');
    await store.clearSession();
    expect(store.getAccessToken()).toBeNull();
  });

  // ---- refresh token via SecureStore ----

  it('persists refresh token via SecureStore', async () => {
    const store = makeSessionStore();
    await store.setSession('acc-1', 'ref-1', 'CUSTOMER');

    expect(secureMocks().setItemAsync).toHaveBeenCalledWith(REFRESH_KEY, 'ref-1');
  });

  it('getRefreshToken reads from SecureStore', async () => {
    secureMocks().getItemAsync.mockResolvedValue('stored-ref-token');

    const store = makeSessionStore();
    const token = await store.getRefreshToken();

    expect(token).toBe('stored-ref-token');
    expect(secureMocks().getItemAsync).toHaveBeenCalledWith(REFRESH_KEY);
  });

  it('clearSession removes refresh token and role from SecureStore', async () => {
    const store = makeSessionStore();
    await store.setSession('acc-1', 'ref-1', 'CUSTOMER');
    await store.clearSession();

    expect(secureMocks().deleteItemAsync).toHaveBeenCalledWith(REFRESH_KEY);
    expect(secureMocks().deleteItemAsync).toHaveBeenCalledWith(ROLE_KEY);
  });

  // ---- hydration on app restart ----

  it('hydrate restores refresh token and role from SecureStore on app start', async () => {
    secureMocks().getItemAsync.mockImplementation(async (key: string) => {
      if (key === REFRESH_KEY) return 'stored-ref-123';
      if (key === ROLE_KEY) return 'DRIVER';
      return null;
    });

    const store = makeSessionStore();
    const restored = await store.hydrate();

    expect(restored).toBe(true);
    expect(await store.getRefreshToken()).toBe('stored-ref-123');
    expect(store.getRole()).toBe('DRIVER');
    // Access token is never stored, so it remains null after hydration
    expect(store.getAccessToken()).toBeNull();
    // Not authenticated until access token is restored
    expect(store.isAuthenticated()).toBe(false);
  });

  it('hydrate works when SecureStore is empty', async () => {
    secureMocks().getItemAsync.mockResolvedValue(null);

    const store = makeSessionStore();
    const restored = await store.hydrate();

    expect(restored).toBe(true);
    expect(await store.getRefreshToken()).toBeNull();
    expect(store.getRole()).toBeNull();
    expect(store.isAuthenticated()).toBe(false);
  });

  it('hydrate returns true when SecureStore is unavailable', async () => {
    secureMocks().isAvailableAsync.mockResolvedValue(false);

    const store = makeSessionStore();
    const restored = await store.hydrate();

    expect(restored).toBe(true);
    expect(store.isAuthenticated()).toBe(false);
  });

  it('hydrate returns true on success', async () => {
    secureMocks().getItemAsync.mockResolvedValue('tok');
    const store = makeSessionStore();
    const result = await store.hydrate();
    expect(result).toBe(true);
  });

  // ---- authentication state ----

  it('isAuthenticated returns false when no access token', () => {
    const store = makeSessionStore();
    expect(store.isAuthenticated()).toBe(false);
  });

  it('isAuthenticated returns true when access token exists', async () => {
    const store = makeSessionStore();
    await store.setSession('acc-valid', 'ref-valid', 'CUSTOMER');
    expect(store.isAuthenticated()).toBe(true);
  });

  it('isAuthenticated returns false when a refresh token exists but access token has not been restored', async () => {
    secureMocks().getItemAsync.mockImplementation(async (key: string) => {
      if (key === REFRESH_KEY) return 'ref-only';
      if (key === ROLE_KEY) return 'CUSTOMER';
      return null;
    });

    const store = makeSessionStore();
    await store.hydrate();

    expect(store.isAuthenticated()).toBe(false);
  });

  it('isAuthenticated returns false after clearSession', async () => {
    const store = makeSessionStore();
    await store.setSession('acc-1', 'ref-1', 'CUSTOMER');
    await store.clearSession();
    expect(store.isAuthenticated()).toBe(false);
  });

  // ---- subscriber notification ----

  it('emits a state change event when setSession is called', async () => {
    const store = makeSessionStore();
    const listener = jest.fn();
    store.subscribe(listener);

    await store.setSession('acc-1', 'ref-1', 'CUSTOMER');

    expect(listener).toHaveBeenCalledWith({ authenticated: true, role: 'CUSTOMER' });
  });

  it('emits a state change event when clearSession is called', async () => {
    const store = makeSessionStore();
    await store.setSession('acc-1', 'ref-1', 'CUSTOMER');

    const listener = jest.fn();
    store.subscribe(listener);

    await store.clearSession();

    expect(listener).toHaveBeenCalledWith({ authenticated: false, role: null });
  });

  it('does not emit after unsubscribe', async () => {
    const store = makeSessionStore();
    const listener = jest.fn();
    const unsubscribe = store.subscribe(listener);

    unsubscribe();
    await store.setSession('acc-1', 'ref-1', 'CUSTOMER');

    expect(listener).not.toHaveBeenCalled();
  });

  it('supports multiple subscribers', async () => {
    const store = makeSessionStore();
    const l1 = jest.fn();
    const l2 = jest.fn();
    store.subscribe(l1);
    store.subscribe(l2);

    await store.setSession('acc-1', 'ref-1', 'CUSTOMER');

    expect(l1).toHaveBeenCalledWith({ authenticated: true, role: 'CUSTOMER' });
    expect(l2).toHaveBeenCalledWith({ authenticated: true, role: 'CUSTOMER' });
  });

  // ---- edge cases ----

  it('setting session with empty token treats as unauthenticated', async () => {
    const store = makeSessionStore();
    await store.setSession('', '', null);
    expect(store.isAuthenticated()).toBe(false);
  });

  it('getRefreshToken returns null when SecureStore unavailable', async () => {
    secureMocks().isAvailableAsync.mockResolvedValue(false);
    const store = makeSessionStore();
    expect(await store.getRefreshToken()).toBeNull();
  });

  it('re-uses in-memory refresh token after setSession', async () => {
    const store = makeSessionStore();
    await store.setSession('acc-1', 'ref-memory', 'CUSTOMER');

    // Should return memory value immediately without hitting SecureStore
    secureMocks().getItemAsync.mockClear();
    const token = await store.getRefreshToken();
    expect(token).toBe('ref-memory');
    expect(secureMocks().getItemAsync).not.toHaveBeenCalled();
  });

  it('preserves the existing role when a refresh rotation updates only tokens', async () => {
    const store = makeSessionStore();
    await store.setSession('acc-1', 'ref-1', 'DRIVER');
    expect(store.getRole()).toBe('DRIVER');

    // Token refresh rotation (role omitted)
    await store.setSession('acc-2', 'ref-2');
    expect(store.getRole()).toBe('DRIVER');
    expect(store.getAccessToken()).toBe('acc-2');
  });
});
