import { Inject, Injectable, Optional } from '@nestjs/common';
import type { UserStatus } from '@prisma/client';

const DEFAULT_ACCOUNT_STATUS_CACHE_TTL_MS = 5_000;
const DEFAULT_ACCOUNT_STATUS_CACHE_MAX_ENTRIES = 100;

export const ACCOUNT_STATUS_CACHE_OPTIONS = Symbol(
  'ACCOUNT_STATUS_CACHE_OPTIONS',
);

export interface CachedAccountStatus {
  readonly userId: string;
  readonly status: UserStatus;
}

export interface AccountStatusCacheOptions {
  readonly ttlMs: number;
  readonly maxEntries: number;
  readonly now: () => number;
}

interface CacheEntry {
  readonly value: CachedAccountStatus;
  readonly expiresAt: number;
}

@Injectable()
export class AccountStatusCache {
  private readonly entries = new Map<string, CacheEntry>();
  private readonly ttlMs: number;
  private readonly maxEntries: number;
  private readonly now: () => number;

  public constructor(
    @Optional()
    @Inject(ACCOUNT_STATUS_CACHE_OPTIONS)
    options?: Partial<AccountStatusCacheOptions>,
  ) {
    this.ttlMs = options?.ttlMs ?? DEFAULT_ACCOUNT_STATUS_CACHE_TTL_MS;
    this.maxEntries =
      options?.maxEntries ?? DEFAULT_ACCOUNT_STATUS_CACHE_MAX_ENTRIES;
    this.now = options?.now ?? Date.now;
  }

  public get(userId: string): CachedAccountStatus | undefined {
    const cached = this.entries.get(userId);
    if (!cached) {
      return undefined;
    }

    if (cached.expiresAt <= this.now()) {
      this.entries.delete(userId);
      return undefined;
    }

    return cached.value;
  }

  public set(value: CachedAccountStatus): void {
    this.evictExpired();

    if (this.entries.has(value.userId)) {
      this.entries.delete(value.userId);
    }

    while (this.entries.size >= this.maxEntries) {
      const oldestUserId = this.entries.keys().next().value as
        | string
        | undefined;
      if (!oldestUserId) {
        break;
      }

      this.entries.delete(oldestUserId);
    }

    this.entries.set(value.userId, {
      value,
      expiresAt: this.now() + this.ttlMs,
    });
  }

  public async getOrLoad(
    userId: string,
    loader: () => Promise<CachedAccountStatus | null>,
  ): Promise<CachedAccountStatus | null> {
    const cached = this.get(userId);
    if (cached) {
      return cached;
    }

    const loaded = await loader();
    if (loaded) {
      this.set(loaded);
    }

    return loaded;
  }

  private evictExpired(): void {
    const now = this.now();
    for (const [userId, entry] of this.entries.entries()) {
      if (entry.expiresAt <= now) {
        this.entries.delete(userId);
      }
    }
  }
}
