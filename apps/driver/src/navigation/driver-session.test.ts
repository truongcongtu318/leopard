import { describe, expect, it } from '@jest/globals';
import { resolveDriverLogin } from './driver-session';

describe('resolveDriverLogin', () => {
  it('cho vào khi đã xác thực và role DRIVER', () => {
    expect(resolveDriverLogin({ isAuthenticated: true, role: 'DRIVER' })).toEqual({ kind: 'enter' });
  });

  it('chặn khi đã xác thực nhưng không phải DRIVER (CUSTOMER)', () => {
    expect(resolveDriverLogin({ isAuthenticated: true, role: 'CUSTOMER' })).toEqual({ kind: 'not-a-driver' });
  });

  it('chặn khi role là FLEET_OWNER hoặc ADMIN', () => {
    expect(resolveDriverLogin({ isAuthenticated: true, role: 'FLEET_OWNER' })).toEqual({ kind: 'not-a-driver' });
    expect(resolveDriverLogin({ isAuthenticated: true, role: 'ADMIN' })).toEqual({ kind: 'not-a-driver' });
  });

  it('coi là chưa đăng nhập khi không có session', () => {
    expect(resolveDriverLogin({ isAuthenticated: false, role: null })).toEqual({ kind: 'unauthenticated' });
  });
});
