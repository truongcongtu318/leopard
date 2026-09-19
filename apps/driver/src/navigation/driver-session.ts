import type { Role } from '@leopard/shared';

export type DriverLoginOutcome =
  | { kind: 'enter' }
  | { kind: 'pending-approval' }
  | { kind: 'not-a-driver' }
  | { kind: 'unauthenticated' };

export function resolveDriverLogin(input: {
  isAuthenticated: boolean;
  role: Role | null;
  status?: string | null;
}): DriverLoginOutcome {
  if (!input.isAuthenticated || input.role === null) {
    return { kind: 'unauthenticated' };
  }
  if (input.status === 'PENDING_APPROVAL') {
    return { kind: 'pending-approval' };
  }
  if (input.role !== 'DRIVER') {
    return { kind: 'not-a-driver' };
  }
  return { kind: 'enter' };
}

