import {
  Injectable,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common';

import { AuthRateLimiter } from '../auth-rate-limiter.js';

interface ThrottledRequest {
  readonly ip?: string;
  readonly ips?: readonly string[];
  readonly headers?: Record<string, string | string[] | undefined>;
  readonly socket?: { readonly remoteAddress?: string };
}

/** Per-IP throttle for auth endpoints (brute-force / abuse defense). */
@Injectable()
export class AuthThrottleGuard implements CanActivate {
  constructor(private readonly limiter: AuthRateLimiter) {}

  public canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<ThrottledRequest>();
    this.limiter.consume(clientKey(request));
    return true;
  }
}

function clientKey(request: ThrottledRequest): string {
  const forwarded = request.headers?.['x-forwarded-for'];
  const forwardedIp =
    typeof forwarded === 'string'
      ? forwarded.split(',')[0]?.trim()
      : Array.isArray(forwarded)
        ? forwarded[0]
        : undefined;

  return (
    request.ips?.[0] ??
    forwardedIp ??
    request.ip ??
    request.socket?.remoteAddress ??
    'unknown'
  );
}
