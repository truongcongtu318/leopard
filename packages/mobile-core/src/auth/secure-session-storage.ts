import * as SecureStore from 'expo-secure-store';

const REFRESH_CREDENTIAL_KEY = 'leopard.refresh';
const ROLE_KEY = 'leopard.role';

let memoryStorage: Map<string, string> | null = null;

interface FallbackStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

function getWebStorage(): FallbackStorage | null {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage;
    }
  } catch {
    // Gracefully handle restricted storage environments (e.g. sandboxed iframes)
  }

  try {
    const g = globalThis as unknown as { localStorage?: Storage };
    if (g.localStorage && typeof g.localStorage.getItem === 'function') {
      return g.localStorage;
    }
  } catch {
    // Gracefully handle missing global localStorage
  }

  // Memory fallback for headless/test environments where neither SecureStore nor localStorage is available
  if (!memoryStorage) {
    memoryStorage = new Map<string, string>();
  }
  return {
    getItem: (key: string) => memoryStorage?.get(key) ?? null,
    setItem: (key: string, value: string) => {
      memoryStorage?.set(key, value);
    },
    removeItem: (key: string) => {
      memoryStorage?.delete(key);
    },
  };
}

/**
 * Thin wrapper around expo-secure-store for storing restart-safe session data.
 * When SecureStore is unavailable (e.g. Web/PWA), falls back to localStorage.
 */
export const secureSessionStorage = {
  async setRefreshToken(value: string): Promise<void> {
    const available = await isAvailable();
    if (available) {
      await SecureStore.setItemAsync(REFRESH_CREDENTIAL_KEY, value);
      return;
    }
    const webStorage = getWebStorage();
    if (webStorage) {
      webStorage.setItem(REFRESH_CREDENTIAL_KEY, value);
    }
  },

  async getRefreshToken(): Promise<string | null> {
    const available = await isAvailable();
    if (available) {
      return SecureStore.getItemAsync(REFRESH_CREDENTIAL_KEY);
    }
    const webStorage = getWebStorage();
    if (webStorage) {
      return webStorage.getItem(REFRESH_CREDENTIAL_KEY);
    }
    return null;
  },

  async removeRefreshToken(): Promise<void> {
    const available = await isAvailable();
    if (available) {
      await SecureStore.deleteItemAsync(REFRESH_CREDENTIAL_KEY);
      return;
    }
    const webStorage = getWebStorage();
    if (webStorage) {
      webStorage.removeItem(REFRESH_CREDENTIAL_KEY);
    }
  },

  async setRole(value: string): Promise<void> {
    const available = await isAvailable();
    if (available) {
      await SecureStore.setItemAsync(ROLE_KEY, value);
      return;
    }
    const webStorage = getWebStorage();
    if (webStorage) {
      webStorage.setItem(ROLE_KEY, value);
    }
  },

  async getRole(): Promise<string | null> {
    const available = await isAvailable();
    if (available) {
      return SecureStore.getItemAsync(ROLE_KEY);
    }
    const webStorage = getWebStorage();
    if (webStorage) {
      return webStorage.getItem(ROLE_KEY);
    }
    return null;
  },

  async removeRole(): Promise<void> {
    const available = await isAvailable();
    if (available) {
      await SecureStore.deleteItemAsync(ROLE_KEY);
      return;
    }
    const webStorage = getWebStorage();
    if (webStorage) {
      webStorage.removeItem(ROLE_KEY);
    }
  },
};

async function isAvailable(): Promise<boolean> {
  if (typeof SecureStore.isAvailableAsync !== 'function') {
    return true;
  }
  return SecureStore.isAvailableAsync();
}

