export interface SavedAddress {
  id: string;
  label: string;
  address: string;
  contactName?: string;
  contactPhone?: string;
  latitude?: number;
  longitude?: number;
  isDefault: boolean;
  category?: 'WAREHOUSE' | 'HOME' | 'OFFICE' | 'OTHER';
}

const STORAGE_KEY = 'leopard_customer_addresses_v1';
const DEFAULT_ADDR_KEY = 'leopard_customer_default_address_v1';

let inMemoryAddresses: SavedAddress[] = [];
let inMemoryDefaultId: string | null = null;

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function secureRandomIdSuffix(length = 8): string {
  const alphabet = 'abcdefghijklmnopqrstuvwxyz0123456789';
  const bytes = new Uint8Array(length);

  if (typeof globalThis !== 'undefined' && globalThis.crypto?.getRandomValues) {
    globalThis.crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < length; i += 1) {
      bytes[i] = (Date.now() + i) & 0xff;
    }
  }

  let out = '';
  for (let i = 0; i < length; i += 1) {
    out += alphabet[bytes[i] % alphabet.length];
  }
  return out;
}

export const addressStore = {
  getAddresses(): SavedAddress[] {
    if (isBrowser()) {
      try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (raw) {
          return JSON.parse(raw) as SavedAddress[];
        }
      } catch {
        // Fallback to in-memory
      }
    }
    return inMemoryAddresses;
  },

  getDefaultAddress(): SavedAddress | null {
    const list = this.getAddresses();
    if (list.length === 0) return null;

    let defaultId: string | null = inMemoryDefaultId;
    if (isBrowser()) {
      try {
        defaultId = window.localStorage.getItem(DEFAULT_ADDR_KEY);
      } catch {
        // ignore
      }
    }

    if (defaultId) {
      const found = list.find((a) => a.id === defaultId);
      if (found) return found;
    }

    return list.find((a) => a.isDefault) ?? list[0] ?? null;
  },

  saveAddress(addr: Omit<SavedAddress, 'id'> & { id?: string }): SavedAddress {
    const list = this.getAddresses();
    const id = addr.id || `addr_${Date.now()}_${secureRandomIdSuffix(8)}`;
    const newAddress: SavedAddress = {
      ...addr,
      id,
    };

    let updatedList: SavedAddress[];
    if (newAddress.isDefault) {
      updatedList = list.map((a) => ({ ...a, isDefault: false }));
      updatedList = [newAddress, ...updatedList];
      inMemoryDefaultId = id;
    } else {
      updatedList = [newAddress, ...list.filter((a) => a.id !== id)];
    }

    inMemoryAddresses = updatedList;

    if (isBrowser()) {
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedList));
        if (newAddress.isDefault) {
          window.localStorage.setItem(DEFAULT_ADDR_KEY, id);
        }
      } catch {
        // ignore storage quota error
      }
    }

    return newAddress;
  },

  setDefaultAddress(id: string): void {
    const list = this.getAddresses();
    const updatedList = list.map((a) => ({
      ...a,
      isDefault: a.id === id,
    }));
    inMemoryAddresses = updatedList;
    inMemoryDefaultId = id;

    if (isBrowser()) {
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedList));
        window.localStorage.setItem(DEFAULT_ADDR_KEY, id);
      } catch {
        // ignore
      }
    }
  },

  deleteAddress(id: string): void {
    const list = this.getAddresses();
    const updatedList = list.filter((a) => a.id !== id);
    inMemoryAddresses = updatedList;

    if (inMemoryDefaultId === id) {
      inMemoryDefaultId = updatedList[0]?.id ?? null;
    }

    if (isBrowser()) {
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedList));
        if (inMemoryDefaultId) {
          window.localStorage.setItem(DEFAULT_ADDR_KEY, inMemoryDefaultId);
        } else {
          window.localStorage.removeItem(DEFAULT_ADDR_KEY);
        }
      } catch {
        // ignore
      }
    }
  },

  clearAll(): void {
    inMemoryAddresses = [];
    inMemoryDefaultId = null;
    if (isBrowser()) {
      try {
        window.localStorage.removeItem(STORAGE_KEY);
        window.localStorage.removeItem(DEFAULT_ADDR_KEY);
      } catch {
        // ignore
      }
    }
  },
};
