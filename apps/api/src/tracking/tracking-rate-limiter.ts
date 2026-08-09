import { DomainError } from '../common/domain-error.js';

const DEFAULT_LIMIT = 1;
const DEFAULT_WINDOW_MS = 2_000;
const DEFAULT_MAX_KEYS = 10_000;

interface RateLimitEntry {
  readonly count: number;
  readonly resetAt: number;
  readonly lastSeenAt: number;
}

export interface TrackingRateLimiterOptions {
  readonly limit?: number;
  readonly windowMs?: number;
  readonly maxKeys?: number;
  readonly now?: () => number;
}

export class TrackingRateLimiter {
  private entries = new Map<string, RateLimitEntry>();
  private readonly limit: number;
  private readonly windowMs: number;
  private readonly maxKeys: number;
  private readonly now: () => number;

  public constructor(options: TrackingRateLimiterOptions = {}) {
    this.limit = options.limit ?? DEFAULT_LIMIT;
    this.windowMs = options.windowMs ?? DEFAULT_WINDOW_MS;
    this.maxKeys = options.maxKeys ?? DEFAULT_MAX_KEYS;
    this.now = options.now ?? Date.now;

    assertPositiveInteger(this.limit, 'limit');
    assertPositiveInteger(this.windowMs, 'windowMs');
    assertPositiveInteger(this.maxKeys, 'maxKeys');
  }

  public get size(): number {
    return this.entries.size;
  }

  public consume(driverId: string, _orderId?: string): void {
    const now = this.now();
    const key = driverId;
    this.entries = pruneExpiredEntries(this.entries, now);
    const current = this.entries.get(key);

    if (!current) {
      if (this.entries.size >= this.maxKeys) {
        const earliestResetAt = Math.min(
          ...[...this.entries.values()].map(({ resetAt }) => resetAt),
        );
        throw rateLimited(Math.max(1, earliestResetAt - now));
      }

      const nextEntries = new Map(this.entries);
      nextEntries.set(key, {
        count: 1,
        resetAt: now + this.windowMs,
        lastSeenAt: now,
      });
      this.entries = nextEntries;
      return;
    }

    if (current.count >= this.limit) {
      const nextEntries = new Map(this.entries);
      nextEntries.set(key, { ...current, lastSeenAt: now });
      this.entries = nextEntries;
      throw rateLimited(Math.max(1, current.resetAt - now));
    }

    const nextEntries = new Map(this.entries);
    nextEntries.set(key, {
      count: current.count + 1,
      resetAt: current.resetAt,
      lastSeenAt: now,
    });
    this.entries = nextEntries;
  }
}

function pruneExpiredEntries(
  entries: ReadonlyMap<string, RateLimitEntry>,
  now: number,
): Map<string, RateLimitEntry> {
  return new Map([...entries].filter(([, entry]) => entry.resetAt > now));
}

function assertPositiveInteger(value: number, name: string): void {
  if (!Number.isSafeInteger(value) || value < 1) {
    throw new RangeError(`${name} must be a positive integer`);
  }
}

function rateLimited(retryAfterMs: number): DomainError {
  return new DomainError(
    'TRACKING_RATE_LIMITED',
    429,
    'Too many tracking points',
    { retryAfterMs },
  );
}
