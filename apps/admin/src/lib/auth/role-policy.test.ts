import { describe, expect, it } from '@jest/globals';

import { ApiError } from '../api/api-error';
import { canAccess, requireRole } from './role-policy';

describe('canAccess', () => {
  it('ADMIN can access admin routes', () => {
    expect(canAccess('ADMIN', ['ADMIN'])).toBe(true);
  });

  it('ADMIN cannot inherit Driver routes', () => {
    expect(canAccess('ADMIN', ['DRIVER'])).toBe(false);
  });

  it('ADMIN can access mixed-role routes', () => {
    expect(canAccess('ADMIN', ['ADMIN', 'DRIVER'])).toBe(true);
  });

  it('DRIVER can access driver routes', () => {
    expect(canAccess('DRIVER', ['DRIVER'])).toBe(true);
  });

  it('DRIVER cannot access admin routes', () => {
    expect(canAccess('DRIVER', ['ADMIN'])).toBe(false);
  });

  it('CUSTOMER gets nothing in admin', () => {
    expect(canAccess('CUSTOMER', ['ADMIN'])).toBe(false);
    expect(canAccess('CUSTOMER', ['DRIVER'])).toBe(false);
  });

  it('returns false for empty allowedRoles', () => {
    expect(canAccess('ADMIN', [])).toBe(false);
    expect(canAccess('DRIVER', [])).toBe(false);
  });
});

describe('requireRole', () => {
  it('does not throw when role is allowed', () => {
    expect(() => requireRole('ADMIN', ['ADMIN'])).not.toThrow();
    expect(() => requireRole('DRIVER', ['ADMIN', 'DRIVER'])).not.toThrow();
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
    const routes: Array<['ADMIN' | 'DRIVER']> = [
      ['ADMIN'],
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
    expect(() => requireRole('ADMIN', ['DRIVER'])).toThrow(ApiError);
    expect(() => requireRole('ADMIN', ['ADMIN', 'DRIVER'])).not.toThrow();
  });
});
