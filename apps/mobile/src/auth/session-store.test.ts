import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';

// Mock expo-secure-store BEFORE importing the module under test.
jest.mock('expo-secure-store', () => {
  const setItemAsync = jest.fn();
  const getItemAsync = jest.fn();
  const deleteItemAsync = jest.fn();
  const isAvailableAsync = jest.fn();

  (globalThis as Record<string, unknown>).__secureStore = {
    setItemAsync,
    getItemAsync,
    deleteItemAsync,
    isAvailableAsync,
  };

  return { setItemAsync, getItemAsync, deleteItemAsync, isAvailableAsync };
}, { virtual: true });

import { SessionStore } from './session-store';

interface SecureStoreMocks {
  setItemAsync: jest.Mock<() => Promise<void>>;
  getItemAsync: jest.Mock<() => Promise<string | null>>;
  deleteItemAsync: jest.Mock<() => Promise<void>>;
  isAvailableAsync: jest.Mock<() => Promise<boolean>>;
}

function secureMocks(): SecureStoreMocks {
  return (globalThis as Record<string, unknown>).__secureStore as SecureStoreMocks;
}

const REFRESH_KEY = 'leopard.refresh';

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

  it('stores access token in memory only (no SecureStore call)', async () => {
    const store = makeSessionStore();
    await store.setSession('acc-123', 'ref-456');

    const accessToken = store.getAccessToken();
    expect(accessToken).toBe('acc-123');
    expect(secureMocks().setItemAsync).toHaveBeenCalledTimes(1); // only refresh
    expect(secureMocks().setItemAsync).toHaveBeenCalledWith(REFRESH_KEY, 'ref-456');
  });

  it('getAccessToken returns null when no session is set', () => {
    const store = makeSessionStore();
    expect(store.getAccessToken()).toBeNull();
  });

  it('getAccessToken returns null after clear', async () => {
    const store = makeSessionStore();
    await store.setSession('acc-123', 'ref-456');
    await store.clearSession();

    expect(store.getAccessToken()).toBeNull();
  });

  // ---- SecureStore refresh persistence ----

  it('persists refresh credential via SecureStore', async () => {
    const store = makeSessionStore();
    await store.setSession('acc-1', 'ref-1');

    expect(secureMocks().setItemAsync).toHaveBeenCalledWith(REFRESH_KEY, 'ref-1');
  });

  it('getRefreshCredential reads from SecureStore', async () => {
    secureMocks().getItemAsync.mockResolvedValue('stored-refresh');
    const store = makeSessionStore();

    const refresh = await store.getRefreshCredential();
    expect(refresh).toBe('stored-refresh');
    expect(secureMocks().getItemAsync).toHaveBeenCalledWith(REFRESH_KEY);
  });

  it('clearSession removes refresh credential from SecureStore', async () => {
    const store = makeSessionStore();
    await store.setSession('acc-1', 'ref-1');
    await store.clearSession();

    expect(secureMocks().deleteItemAsync).toHaveBeenCalledWith(REFRESH_KEY);
  });

  // ---- hydrate ----

  it('hydrate restores refresh credential from SecureStore on app start', async () => {
    secureMocks().getItemAsync.mockResolvedValue('hydrated-refresh');
    const store = makeSessionStore();

    await store.hydrate();

    const refresh = await store.getRefreshCredential();
    expect(refresh).toBe('hydrated-refresh');
    // accessToken should NOT be restored from SecureStore
    expect(store.getAccessToken()).toBeNull();
  });

  it('hydrate works when SecureStore is empty', async () => {
    secureMocks().getItemAsync.mockResolvedValue(null);
    const store = makeSessionStore();

    await store.hydrate();

    expect(store.getAccessToken()).toBeNull();
  });

  it('hydrate returns true when SecureStore is unavailable', async () => {
    secureMocks().isAvailableAsync.mockResolvedValue(false);
    secureMocks().getItemAsync.mockResolvedValue(null);
    const store = makeSessionStore();

    const result = await store.hydrate();
    expect(result).toBe(true);
  });

  it('hydrate returns true on success', async () => {
    secureMocks().getItemAsync.mockResolvedValue('some-refresh');
    const store = makeSessionStore();

    const result = await store.hydrate();
    expect(result).toBe(true);
  });

  // ---- isAuthenticated ----

  it('isAuthenticated returns false when no access token', () => {
    const store = makeSessionStore();
    expect(store.isAuthenticated()).toBe(false);
  });

  it('isAuthenticated returns true when access token exists', async () => {
    const store = makeSessionStore();
    await store.setSession('acc-1', 'ref-1');

    expect(store.isAuthenticated()).toBe(true);
  });

  it('isAuthenticated returns false after clearSession', async () => {
    const store = makeSessionStore();
    await store.setSession('acc-1', 'ref-1');
    await store.clearSession();

    expect(store.isAuthenticated()).toBe(false);
  });

  // ---- state change events ----

  it('emits a state change event when setSession is called', async () => {
    const store = makeSessionStore();
    const listener = jest.fn();
    const unsubscribe = store.subscribe(listener);

    await store.setSession('acc-1', 'ref-1');

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith({ authenticated: true });

    unsubscribe();
  });

  it('emits a state change event when clearSession is called', async () => {
    const store = makeSessionStore();
    await store.setSession('acc-1', 'ref-1'); // set first

    const listener = jest.fn();
    const unsubscribe = store.subscribe(listener);

    await store.clearSession();

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith({ authenticated: false });

    unsubscribe();
  });

  it('does not emit after unsubscribe', async () => {
    const store = makeSessionStore();
    const listener = jest.fn();
    const unsubscribe = store.subscribe(listener);
    unsubscribe();

    await store.setSession('acc-1', 'ref-1');

    expect(listener).not.toHaveBeenCalled();
  });

  it('supports multiple subscribers', async () => {
    const store = makeSessionStore();
    const l1 = jest.fn();
    const l2 = jest.fn();

    const unsub1 = store.subscribe(l1);
    const unsub2 = store.subscribe(l2);

    await store.setSession('acc-1', 'ref-1');

    expect(l1).toHaveBeenCalledTimes(1);
    expect(l2).toHaveBeenCalledTimes(1);

    unsub1();
    unsub2();
  });

  // ---- edge cases ----

  it('setting session with empty token treats as unauthenticated', async () => {
    const store = makeSessionStore();
    await store.setSession('', 'ref-1');
    expect(store.isAuthenticated()).toBe(false);
  });

  it('getRefreshCredential returns null when SecureStore unavailable', async () => {
    secureMocks().isAvailableAsync.mockResolvedValue(false);
    secureMocks().getItemAsync.mockResolvedValue(null);
    const store = makeSessionStore();

    const result = await store.getRefreshCredential();
    expect(result).toBeNull();
  });

  it('re-uses in-memory refresh credential after setSession', async () => {
    const store = makeSessionStore();
    await store.setSession('acc-1', 'ref-set');

    secureMocks().getItemAsync.mockClear();
    const refresh = await store.getRefreshCredential();

    expect(refresh).toBe('ref-set');
    expect(secureMocks().getItemAsync).not.toHaveBeenCalled();
  });
});
