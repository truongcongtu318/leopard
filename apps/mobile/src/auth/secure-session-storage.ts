import * as SecureStore from 'expo-secure-store';

const REFRESH_CREDENTIAL_KEY = 'leopard.refresh';
const ROLE_KEY = 'leopard.role';

/**
 * Thin wrapper around expo-secure-store for storing restart-safe session data.
 * All methods handle SecureStore unavailability gracefully by returning null.
 */
export const secureSessionStorage = {
  async setRefreshToken(value: string): Promise<void> {
    const available = await isAvailable();
    if (!available) return;
    await SecureStore.setItemAsync(REFRESH_CREDENTIAL_KEY, value);
  },

  async getRefreshToken(): Promise<string | null> {
    const available = await isAvailable();
    if (!available) return null;
    return SecureStore.getItemAsync(REFRESH_CREDENTIAL_KEY);
  },

  async removeRefreshToken(): Promise<void> {
    const available = await isAvailable();
    if (!available) return;
    await SecureStore.deleteItemAsync(REFRESH_CREDENTIAL_KEY);
  },

  async setRole(value: string): Promise<void> {
    const available = await isAvailable();
    if (!available) return;
    await SecureStore.setItemAsync(ROLE_KEY, value);
  },

  async getRole(): Promise<string | null> {
    const available = await isAvailable();
    if (!available) return null;
    return SecureStore.getItemAsync(ROLE_KEY);
  },

  async removeRole(): Promise<void> {
    const available = await isAvailable();
    if (!available) return;
    await SecureStore.deleteItemAsync(ROLE_KEY);
  },
};

async function isAvailable(): Promise<boolean> {
  if (typeof SecureStore.isAvailableAsync !== 'function') {
    return true;
  }
  return SecureStore.isAvailableAsync();
}
