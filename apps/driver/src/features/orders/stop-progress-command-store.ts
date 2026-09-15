import * as SecureStore from 'expo-secure-store';

const STORAGE_PREFIX = 'leopard.stop_progress.';

export interface StorageAdapter {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

export function generateUuidV4(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

let inMemoryStorage: Map<string, string> | null = null;

function getFallbackStorage(): StorageAdapter {
  // Check web localStorage
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return {
        getItem: async (key) => window.localStorage.getItem(key),
        setItem: async (key, value) => {
          window.localStorage.setItem(key, value);
        },
        removeItem: async (key) => {
          window.localStorage.removeItem(key);
        },
      };
    }
  } catch {
    // restricted storage
  }

  // Memory fallback for headless / test environments
  if (!inMemoryStorage) {
    inMemoryStorage = new Map<string, string>();
  }
  const mem = inMemoryStorage;
  return {
    getItem: async (key) => mem.get(key) ?? null,
    setItem: async (key, value) => {
      mem.set(key, value);
    },
    removeItem: async (key) => {
      mem.delete(key);
    },
  };
}

async function isSecureStoreAvailable(): Promise<boolean> {
  try {
    return await SecureStore.isAvailableAsync();
  } catch {
    return false;
  }
}

export function createDefaultStorageAdapter(): StorageAdapter {
  const fallback = getFallbackStorage();

  return {
    async getItem(key: string): Promise<string | null> {
      const available = await isSecureStoreAvailable();
      if (available) {
        try {
          return await SecureStore.getItemAsync(key);
        } catch {
          return fallback.getItem(key);
        }
      }
      return fallback.getItem(key);
    },

    async setItem(key: string, value: string): Promise<void> {
      const available = await isSecureStoreAvailable();
      if (available) {
        try {
          await SecureStore.setItemAsync(key, value);
          return;
        } catch {
          await fallback.setItem(key, value);
          return;
        }
      }
      await fallback.setItem(key, value);
    },

    async removeItem(key: string): Promise<void> {
      const available = await isSecureStoreAvailable();
      if (available) {
        try {
          await SecureStore.deleteItemAsync(key);
          return;
        } catch {
          await fallback.removeItem(key);
          return;
        }
      }
      await fallback.removeItem(key);
    },
  };
}

export class StopProgressCommandStore {
  private readonly storage: StorageAdapter;
  private inFlightLocks = new Set<string>();

  constructor(storage: StorageAdapter = createDefaultStorageAdapter()) {
    this.storage = storage;
  }

  public getCommandKey(orderId: string, stopId: string, step: string): string {
    return `${STORAGE_PREFIX}${orderId}:${stopId}:${step}`;
  }

  /**
   * Tries to acquire an in-flight UI double-tap lock for this logical command.
   * Returns false if already running (locked).
   */
  public acquireLock(orderId: string, stopId: string, step: string): boolean {
    const key = this.getCommandKey(orderId, stopId, step);
    if (this.inFlightLocks.has(key)) {
      return false;
    }
    this.inFlightLocks.add(key);
    return true;
  }

  public releaseLock(orderId: string, stopId: string, step: string): void {
    const key = this.getCommandKey(orderId, stopId, step);
    this.inFlightLocks.delete(key);
  }

  public isLocked(orderId: string, stopId: string, step: string): boolean {
    const key = this.getCommandKey(orderId, stopId, step);
    return this.inFlightLocks.has(key);
  }

  /**
   * Retrieves an existing pending UUID for this command if a previous attempt
   * timed out or failed with network error, or generates and stores a new UUID.
   */
  public async getOrCreateCommandId(
    orderId: string,
    stopId: string,
    step: string,
  ): Promise<string> {
    const key = this.getCommandKey(orderId, stopId, step);
    const existing = await this.storage.getItem(key);
    if (existing) {
      return existing;
    }
    const newId = generateUuidV4();
    await this.storage.setItem(key, newId);
    return newId;
  }

  /**
   * Clears the pending UUID upon confirmed success or replayed success.
   * This ensures subsequent logical commands (e.g. after Admin void) generate a fresh UUID.
   */
  public async clearCommandId(
    orderId: string,
    stopId: string,
    step: string,
  ): Promise<void> {
    const key = this.getCommandKey(orderId, stopId, step);
    await this.storage.removeItem(key);
  }
}

export const stopProgressCommandStore = new StopProgressCommandStore();
