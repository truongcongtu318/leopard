import { Injectable } from '@nestjs/common';

import { DomainError } from '../common/domain-error.js';

const DEFAULT_LIMIT = 20;
const DEFAULT_WINDOW_MS = 60_000;
const DEFAULT_MAX_KEYS = 50_000;

interface RateLimitEntry {
  readonly count: number;
  readonly resetAt: number;
}

export interface AuthRateLimiterOptions {
  readonly limit?: number;
  readonly windowMs?: number;
  readonly maxKeys?: number;
  readonly now?: () => number;
}

/**
 * Fixed-window per-key rate limiter for auth endpoints (brute-force / abuse
 * defense). In-memory, mirrors the tracking limiter pattern. Keyed by client IP.
 */
@Injectable()
export class AuthRateLimiter {
  private entries = new Map<string, RateLimitEntry>();
  private readonly limit: number;
  private readonly windowMs: number;
  private readonly maxKeys: number;
  private readonly now: () => number;

  public constructor(options: AuthRateLimiterOptions = {}) {
    this.limit = options.limit ?? DEFAULT_LIMIT;
    this.windowMs = options.windowMs ?? DEFAULT_WINDOW_MS;
    this.maxKeys = options.maxKeys ?? DEFAULT_MAX_KEYS;
    this.now = options.now ?? Date.now;
  }

  public get size(): number {
    return this.entries.size;
  }

  public consume(key: string): void {
    const now = this.now();
    this.entries = pruneExpired(this.entries, now);
    const current = this.entries.get(key);

    if (!current || current.resetAt <= now) {
      if (!current && this.entries.size >= this.maxKeys) {
        throw rateLimited(this.windowMs);
      }
      const next = new Map(this.entries);
      next.set(key, { count: 1, resetAt: now + this.windowMs });
      this.entries = next;
      return;
    }

    if (current.count >= this.limit) {
      throw rateLimited(Math.max(1, current.resetAt - now));
    }

    const next = new Map(this.entries);
    next.set(key, { count: current.count + 1, resetAt: current.resetAt });
    this.entries = next;
  }
}

function pruneExpired(
  entries: ReadonlyMap<string, RateLimitEntry>,
  now: number,
): Map<string, RateLimitEntry> {
  return new Map([...entries].filter(([, entry]) => entry.resetAt > now));
}

function rateLimited(retryAfterMs: number): DomainError {
  return new DomainError(
    'AUTH_RATE_LIMITED',
    429,
    'Quá nhiều yêu cầu xác thực, vui lòng thử lại sau',
    { retryAfterMs },
  );
}
