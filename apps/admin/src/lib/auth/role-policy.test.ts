import { describe, expect, it } from '@jest/globals';

import { ApiError } from '../api/api-error';
import { canAccess, requireRole } from './role-policy';

describe('canAccess', () => {
  it('ADMIN can access admin routes', () => {
    expect(canAccess('ADMIN', ['ADMIN'])).toBe(true);
  });

  it('ADMIN cannot inherit Fleet Owner routes', () => {
    expect(canAccess('ADMIN', ['FLEET_OWNER'])).toBe(false);
  });

  it('ADMIN cannot inherit Driver routes', () => {
    expect(canAccess('ADMIN', ['DRIVER'])).toBe(false);
  });

  it('ADMIN can access mixed-role routes', () => {
    expect(canAccess('ADMIN', ['ADMIN', 'FLEET_OWNER', 'DRIVER'])).toBe(true);
  });

  it('FLEET_OWNER can access fleet routes', () => {
    expect(canAccess('FLEET_OWNER', ['FLEET_OWNER'])).toBe(true);
  });

  it('FLEET_OWNER cannot access admin routes', () => {
    expect(canAccess('FLEET_OWNER', ['ADMIN'])).toBe(false);
  });

  it('FLEET_OWNER can access fleet+driver routes (mixed)', () => {
    expect(canAccess('FLEET_OWNER', ['FLEET_OWNER', 'DRIVER'])).toBe(true);
  });

  it('FLEET_OWNER cannot inherit Driver-only routes', () => {
    expect(canAccess('FLEET_OWNER', ['DRIVER'])).toBe(false);
  });

  it('DRIVER can access driver routes', () => {
    expect(canAccess('DRIVER', ['DRIVER'])).toBe(true);
  });

  it('DRIVER cannot access fleet routes', () => {
    expect(canAccess('DRIVER', ['FLEET_OWNER'])).toBe(false);
  });

  it('DRIVER cannot access admin routes', () => {
    expect(canAccess('DRIVER', ['ADMIN'])).toBe(false);
  });

  it('CUSTOMER gets nothing in admin', () => {
    expect(canAccess('CUSTOMER', ['ADMIN'])).toBe(false);
    expect(canAccess('CUSTOMER', ['FLEET_OWNER'])).toBe(false);
    expect(canAccess('CUSTOMER', ['DRIVER'])).toBe(false);
  });

  it('returns false for empty allowedRoles', () => {
    expect(canAccess('ADMIN', [])).toBe(false);
    expect(canAccess('FLEET_OWNER', [])).toBe(false);
  });
});

describe('requireRole', () => {
  it('does not throw when role is allowed', () => {
    expect(() => requireRole('ADMIN', ['ADMIN'])).not.toThrow();
    expect(() => requireRole('FLEET_OWNER', ['FLEET_OWNER', 'DRIVER'])).not.toThrow();
  });

  it('throws ApiError FORBIDDEN when role is not allowed', () => {
    try {
      requireRole('DRIVER', ['ADMIN']);
      // Should not reach here
      expect(true).toBe(false);
    } catch (error) {
      expect(error).toBeInstanceOf(ApiError);
      const apiError = error as ApiError;
      expect(apiError.statusCode).toBe(403);
      expect(apiError.code).toBe('FORBIDDEN');
    }
  });

  it('throws FORBIDDEN for CUSTOMER on all admin routes', () => {
    const routes: Array<['ADMIN' | 'FLEET_OWNER' | 'DRIVER']> = [
      ['ADMIN'],
      ['FLEET_OWNER'],
      ['DRIVER'],
    ];
    for (const [role] of routes) {
      try {
        requireRole('CUSTOMER', [role]);
        expect(true).toBe(false);
      } catch (error) {
        expect(ApiError.isApiError(error)).toBe(true);
        expect((error as ApiError).statusCode).toBe(403);
      }
    }
  });

  it('enforces exact roles through requireRole', () => {
    expect(() => requireRole('ADMIN', ['ADMIN'])).not.toThrow();
    expect(() => requireRole('ADMIN', ['FLEET_OWNER'])).toThrow(ApiError);
    expect(() => requireRole('ADMIN', ['DRIVER'])).toThrow(ApiError);
    expect(() => requireRole('ADMIN', ['ADMIN', 'FLEET_OWNER', 'DRIVER'])).not.toThrow();
  });
});
