/**
 * Ambient declaration for expo-secure-store.
 * The actual package must be installed by the coordinator:
 *   expo-secure-store@^57.0.1
 */
declare module 'expo-secure-store' {
  export function isAvailableAsync(): Promise<boolean>;
  export function setItemAsync(key: string, value: string): Promise<void>;
  export function getItemAsync(key: string): Promise<string | null>;
  export function deleteItemAsync(key: string): Promise<void>;
}
