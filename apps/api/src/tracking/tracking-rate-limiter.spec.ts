import { DomainError } from '../common/domain-error.js';
import { TrackingRateLimiter } from './tracking-rate-limiter.js';

describe('TrackingRateLimiter', () => {
  it('limits per Driver across orders and recovers after the window', () => {
    let now = 1_000;
    const limiter = new TrackingRateLimiter({
      limit: 2,
      windowMs: 1_000,
      now: () => now,
    });

    limiter.consume('driver-a', 'order-a');
    limiter.consume('driver-a', 'order-a');
    expectRateLimited(() => limiter.consume('driver-a', 'order-a'));

    expectRateLimited(() => limiter.consume('driver-a', 'order-b'));
    expect(() => limiter.consume('driver-b', 'order-a')).not.toThrow();

    now = 2_001;
    expect(() => limiter.consume('driver-a', 'order-a')).not.toThrow();
  });

  it('defaults to one point per two seconds per Driver', () => {
    let now = 1_000;
    const limiter = new TrackingRateLimiter({ now: () => now });

    limiter.consume('driver-a', 'order-a');
    expectRateLimited(() => limiter.consume('driver-a', 'order-b'));
    now = 3_000;
    expect(() => limiter.consume('driver-a', 'order-b')).not.toThrow();
  });

  it('bounds retained keys without evicting an active quota', () => {
    let now = 1_000;
    const limiter = new TrackingRateLimiter({
      limit: 1,
      windowMs: 2_000,
      maxKeys: 2,
      now: () => now,
    });

    limiter.consume('driver-a', 'order-a');
    limiter.consume('driver-b', 'order-b');
    expectRateLimited(() => limiter.consume('driver-c', 'order-c'));
    expect(limiter.size).toBe(2);
    expectRateLimited(() => limiter.consume('driver-a', 'order-a'));

    now = 3_001;
    expect(() => limiter.consume('driver-c', 'order-c')).not.toThrow();
    expect(limiter.size).toBe(1);
  });

  it('rejects invalid configuration', () => {
    expect(() => new TrackingRateLimiter({ limit: 0, windowMs: 1_000 })).toThrow(
      RangeError,
    );
    expect(() => new TrackingRateLimiter({ limit: 1, windowMs: 0 })).toThrow(
      RangeError,
    );
  });
});

function expectRateLimited(action: () => void): void {
  try {
    action();
    throw new Error('Expected rate limit error');
  } catch (error) {
    expect(error).toBeInstanceOf(DomainError);
    expect((error as DomainError).code).toBe('TRACKING_RATE_LIMITED');
    expect((error as DomainError).details).toEqual(
      expect.objectContaining({ retryAfterMs: expect.any(Number) }),
    );
  }
}
