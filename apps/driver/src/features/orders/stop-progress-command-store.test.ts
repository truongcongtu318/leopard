import { describe, expect, it } from '@jest/globals';

import {
  generateUuidV4,
  StopProgressCommandStore,
  type StorageAdapter,
} from './stop-progress-command-store';

class MemoryStorageAdapter implements StorageAdapter {
  private mem = new Map<string, string>();

  async getItem(key: string): Promise<string | null> {
    return this.mem.get(key) ?? null;
  }

  async setItem(key: string, value: string): Promise<void> {
    this.mem.set(key, value);
  }

  async removeItem(key: string): Promise<void> {
    this.mem.delete(key);
  }
}

describe('StopProgressCommandStore', () => {
  it('generateUuidV4 returns a valid RFC4122 v4 UUID', () => {
    const uuid = generateUuidV4();
    expect(uuid).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
  });

  it('generates consistent command key per orderId:stopId:step', () => {
    const store = new StopProgressCommandStore(new MemoryStorageAdapter());
    const key = store.getCommandKey('order-1', 'stop-A', 'ARRIVED');
    expect(key).toBe('leopard.stop_progress.order-1:stop-A:ARRIVED');
  });

  it('prevents double-tap via in-flight UI lock', () => {
    const store = new StopProgressCommandStore(new MemoryStorageAdapter());
    expect(store.acquireLock('order-1', 'stop-A', 'ARRIVED')).toBe(true);
    expect(store.isLocked('order-1', 'stop-A', 'ARRIVED')).toBe(true);

    // Double tap immediately blocked
    expect(store.acquireLock('order-1', 'stop-A', 'ARRIVED')).toBe(false);

    // Other stop / step is not blocked
    expect(store.acquireLock('order-1', 'stop-B', 'ARRIVED')).toBe(true);

    // Release allows acquiring again
    store.releaseLock('order-1', 'stop-A', 'ARRIVED');
    expect(store.isLocked('order-1', 'stop-A', 'ARRIVED')).toBe(false);
    expect(store.acquireLock('order-1', 'stop-A', 'ARRIVED')).toBe(true);
  });

  it('reuses the same commandId on retry if previous attempt failed or timed out', async () => {
    const storage = new MemoryStorageAdapter();
    const store = new StopProgressCommandStore(storage);

    const firstId = await store.getOrCreateCommandId('order-1', 'stop-A', 'ARRIVED');
    expect(firstId).toBeTruthy();

    // Simulating retry after timeout
    const secondId = await store.getOrCreateCommandId('order-1', 'stop-A', 'ARRIVED');
    expect(secondId).toBe(firstId); // Reused identical UUIDv4
  });

  it('clears the commandId on confirmed success so future actions get fresh IDs', async () => {
    const storage = new MemoryStorageAdapter();
    const store = new StopProgressCommandStore(storage);

    const firstId = await store.getOrCreateCommandId('order-1', 'stop-A', 'ARRIVED');
    await store.clearCommandId('order-1', 'stop-A', 'ARRIVED');

    const freshId = await store.getOrCreateCommandId('order-1', 'stop-A', 'ARRIVED');
    expect(freshId).not.toBe(firstId);
  });
});
