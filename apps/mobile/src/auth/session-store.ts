import { secureSessionStorage } from './secure-session-storage';

export interface SessionState {
  authenticated: boolean;
}

type Listener = (state: SessionState) => void;

/**
 * SessionStore manages the authentication session:
 * - accessToken is kept in memory only (never persisted)
 * - refreshCredential is persisted via expo-secure-store
 *
 * Subscribers are notified of state changes (authenticated / not).
 */
export class SessionStore {
  private accessToken: string | null = null;
  private refreshCredential: string | null = null;
  private listeners = new Set<Listener>();

  // ---- public API ----

  async setSession(accessToken: string, refreshCredential: string): Promise<void> {
    this.accessToken = accessToken;
    this.refreshCredential = refreshCredential;
    await secureSessionStorage.setRefreshCredential(refreshCredential);
    this.notify();
  }

  getAccessToken(): string | null {
    return this.accessToken;
  }

  async getRefreshCredential(): Promise<string | null> {
    // Re-use in-memory value if available (set via setSession or hydrate)
    if (this.refreshCredential !== null) {
      return this.refreshCredential;
    }
    return secureSessionStorage.getRefreshCredential();
  }

  async clearSession(): Promise<void> {
    this.accessToken = null;
    this.refreshCredential = null;
    await secureSessionStorage.removeRefreshCredential();
    this.notify();
  }

  isAuthenticated(): boolean {
    return this.accessToken !== null && this.accessToken !== '';
  }

  /**
   * Restore the refresh credential from SecureStore on app start.
   * Returns false if SecureStore is unavailable, true otherwise.
   * The access token is never persisted - only the refresh credential.
   */
  async hydrate(): Promise<boolean> {
    try {
      const stored = await secureSessionStorage.getRefreshCredential();
      // null means either unavailable or empty - both are fine, just nothing to restore
      if (stored !== null) {
        this.refreshCredential = stored;
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
    const state: SessionState = { authenticated: this.isAuthenticated() };
    for (const listener of this.listeners) {
      listener(state);
    }
  }
}

/**
 * Singleton session store instance for use throughout the app.
 */
export const sessionStore = new SessionStore();
