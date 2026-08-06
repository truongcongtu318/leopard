import { secureSessionStorage } from './secure-session-storage';
import type { Role } from '@leopard/shared';

export interface SessionState {
  authenticated: boolean;
  role: Role | null;
}

type Listener = (state: SessionState) => void;

/**
 * SessionStore manages the authentication session:
 * - accessToken is kept in memory only (never persisted)
 * - refreshToken is persisted via expo-secure-store
 * - role is persisted so protected layouts can enforce the authenticated role
 *
 * Subscribers are notified of state changes (authenticated / not).
 */
export class SessionStore {
  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  private role: Role | null = null;
  private listeners = new Set<Listener>();

  // ---- public API ----

  async setSession(
    accessToken: string,
    refreshToken: string,
    role?: Role | null,
  ): Promise<void> {
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;
    await secureSessionStorage.setRefreshToken(refreshToken);

    if (role !== undefined) {
      this.role = role;
      if (role === null) {
        await secureSessionStorage.removeRole();
      } else {
        await secureSessionStorage.setRole(role);
      }
    }

    this.notify();
  }

  getAccessToken(): string | null {
    return this.accessToken;
  }

  async getRefreshToken(): Promise<string | null> {
    // Re-use in-memory value if available (set via setSession or hydrate)
    if (this.refreshToken !== null) {
      return this.refreshToken;
    }
    return secureSessionStorage.getRefreshToken();
  }

  getRole(): Role | null {
    return this.role;
  }

  async clearSession(): Promise<void> {
    this.accessToken = null;
    this.refreshToken = null;
    this.role = null;
    await secureSessionStorage.removeRefreshToken();
    await secureSessionStorage.removeRole();
    this.notify();
  }

  isAuthenticated(): boolean {
    return this.accessToken !== null && this.accessToken !== '';
  }

  /**
   * Restore the refresh token and role from SecureStore on app start.
   * Returns false if SecureStore is unavailable, true otherwise.
   * The access token is never persisted.
   */
  async hydrate(): Promise<boolean> {
    try {
      const stored = await secureSessionStorage.getRefreshToken();
      const storedRole = await secureSessionStorage.getRole();
      // null means either unavailable or empty - both are fine, just nothing to restore
      if (stored !== null) {
        this.refreshToken = stored;
      }
      if (isRole(storedRole)) {
        this.role = storedRole;
      }
      return true;
    } catch {
      return false;
    }
  }

  // ---- subscriptions ----

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  // ---- internal ----

  private notify(): void {
    const state: SessionState = {
      authenticated: this.isAuthenticated(),
      role: this.role,
    };
    for (const listener of this.listeners) {
      listener(state);
    }
  }
}

function isRole(value: string | null): value is Role {
  return (
    value === 'CUSTOMER' ||
    value === 'DRIVER' ||
    value === 'FLEET_OWNER' ||
    value === 'ADMIN'
  );
}

/**
 * Singleton session store instance for use throughout the app.
 */
export const sessionStore = new SessionStore();
