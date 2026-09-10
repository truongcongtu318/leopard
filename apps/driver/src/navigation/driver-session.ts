import type { Role } from '@leopard/shared';

export type DriverLoginOutcome =
  | { kind: 'enter' }
  | { kind: 'not-a-driver' }
  | { kind: 'unauthenticated' };

export function resolveDriverLogin(input: {
  isAuthenticated: boolean;
  role: Role | null;
}): DriverLoginOutcome {
  if (!input.isAuthenticated || input.role === null) {
    return { kind: 'unauthenticated' };
  }
  if (input.role !== 'DRIVER') {
    return { kind: 'not-a-driver' };
  }
  return { kind: 'enter' };
}
