/// <reference types="jest" />

import { AuthService } from './auth.service.js';

describe('AuthService.serializeUser', () => {
  const svc = Object.create(AuthService.prototype) as {
    serializeUser: (u: unknown) => {
      profileComplete: boolean;
      name: string | null;
      email: string | null;
      avatarStorageKey: string | null;
    };
  };

  it('marks profileComplete when onboardedAt is set and exposes name/email', () => {
    const out = svc.serializeUser({
      id: 'u1', phone: '+84900000001', email: 'a@b.com', name: 'An',
      role: 'CUSTOMER', status: 'ACTIVE', onboardedAt: new Date(),
    });
    expect(out.profileComplete).toBe(true);
    expect(out.name).toBe('An');
    expect(out.email).toBe('a@b.com');
  });

  it('marks profileComplete false when onboardedAt is null', () => {
    const out = svc.serializeUser({
      id: 'u2', phone: '+84900000002', email: null, name: null,
      role: 'CUSTOMER', status: 'ACTIVE', onboardedAt: null,
    });
    expect(out.profileComplete).toBe(false);
  });

  it('includes avatarStorageKey in the serialized user when set', () => {
    const out = svc.serializeUser({
      id: 'u1', phone: '+84900000001', email: 'a@b.com', name: 'An',
      role: 'CUSTOMER', status: 'ACTIVE', onboardedAt: new Date(),
      avatarStorageKey: 'avatars/u1/x.png',
    });
    expect(out.avatarStorageKey).toBe('avatars/u1/x.png');
  });
});
