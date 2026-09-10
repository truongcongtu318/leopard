import { describe, expect, it } from '@jest/globals';

import { AuthRateLimiter } from './auth-rate-limiter.js';

describe('AuthRateLimiter', () => {
  it('allows requests up to the limit within a window', () => {
    const limiter = new AuthRateLimiter({ limit: 3, windowMs: 1000, now: () => 1000 });

    expect(() => limiter.consume('ip-1')).not.toThrow();
    expect(() => limiter.consume('ip-1')).not.toThrow();
    expect(() => limiter.consume('ip-1')).not.toThrow();
  });

  it('throws AUTH_RATE_LIMITED when the limit is exceeded', () => {
    const limiter = new AuthRateLimiter({ limit: 2, windowMs: 1000, now: () => 5000 });

    limiter.consume('ip-1');
    limiter.consume('ip-1');

    expect(() => limiter.consume('ip-1')).toThrow(
      expect.objectContaining({ code: 'AUTH_RATE_LIMITED' }),
    );
  });

  it('tracks keys independently', () => {
    const limiter = new AuthRateLimiter({ limit: 1, windowMs: 1000, now: () => 1000 });

    limiter.consume('ip-1');
    expect(() => limiter.consume('ip-2')).not.toThrow();
    expect(() => limiter.consume('ip-1')).toThrow(
      expect.objectContaining({ code: 'AUTH_RATE_LIMITED' }),
    );
  });

  it('resets the window after it elapses', () => {
    let clock = 1000;
    const limiter = new AuthRateLimiter({ limit: 1, windowMs: 1000, now: () => clock });

    limiter.consume('ip-1');
    expect(() => limiter.consume('ip-1')).toThrow(
      expect.objectContaining({ code: 'AUTH_RATE_LIMITED' }),
    );

    clock = 2500; // beyond the window
    expect(() => limiter.consume('ip-1')).not.toThrow();
  });
});
