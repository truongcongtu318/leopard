import * as SecureStore from 'expo-secure-store';

const REFRESH_CREDENTIAL_KEY = 'leopard.refresh';

/**
 * Thin wrapper around expo-secure-store for storing the refresh credential.
 * All methods handle SecureStore unavailability gracefully by returning null.
 */
export const secureSessionStorage = {
  async setRefreshCredential(value: string): Promise<void> {
    const available = await SecureStore.isAvailableAsync();
    if (!available) return;
    await SecureStore.setItemAsync(REFRESH_CREDENTIAL_KEY, value);
  },

  async getRefreshCredential(): Promise<string | null> {
    const available = await SecureStore.isAvailableAsync();
    if (!available) return null;
    return SecureStore.getItemAsync(REFRESH_CREDENTIAL_KEY);
  },

  async removeRefreshCredential(): Promise<void> {
    const available = await SecureStore.isAvailableAsync();
    if (!available) return;
    await SecureStore.deleteItemAsync(REFRESH_CREDENTIAL_KEY);
  },
};
