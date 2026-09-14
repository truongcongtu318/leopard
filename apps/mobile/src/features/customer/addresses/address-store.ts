import { httpClient } from '@leopard/mobile-core/src/api/http-client';

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

  async fetchAddresses(): Promise<SavedAddress[]> {
    try {
      const remote = await httpClient.get<any[]>('/users/me/addresses');
      if (Array.isArray(remote)) {
        const cached = this.getAddresses();
        const cachedMap = new Map(cached.map((a) => [a.id, a]));
        const mapped: SavedAddress[] = remote.map((item: any) => {
          const local = cachedMap.get(item.id);
          return {
            id: item.id,
            label: item.label,
            address: item.address,
            latitude: typeof item.latitude === 'number' ? item.latitude : local?.latitude,
            longitude: typeof item.longitude === 'number' ? item.longitude : local?.longitude,
            isDefault: Boolean(item.isDefault),
            contactName: item.contactName || local?.contactName || 'Người nhận',
            contactPhone: item.contactPhone || local?.contactPhone || '0900000000',
            category: item.category || local?.category || 'OTHER',
          };
        });
        inMemoryAddresses = mapped;
        const def = mapped.find((a) => a.isDefault);
        inMemoryDefaultId = def ? def.id : mapped[0]?.id ?? null;
        if (isBrowser()) {
          try {
            window.localStorage.setItem(STORAGE_KEY, JSON.stringify(mapped));
            if (inMemoryDefaultId) {
              window.localStorage.setItem(DEFAULT_ADDR_KEY, inMemoryDefaultId);
            }
          } catch {
            // ignore: localStorage quota or unavailable (offline cache)
          }
        }
        return mapped;
      }
    } catch {
      // offline fallback to local cache
    }
    return this.getAddresses();
  },

  persistLocal(newAddress: SavedAddress): void {
    const list = this.getAddresses();
    let updatedList: SavedAddress[];
    if (newAddress.isDefault) {
      updatedList = list.map((a) => ({ ...a, isDefault: false }));
      updatedList = [newAddress, ...updatedList];
      inMemoryDefaultId = newAddress.id;
    } else {
      updatedList = [newAddress, ...list.filter((a) => a.id !== newAddress.id)];
    }

    inMemoryAddresses = updatedList;

    if (isBrowser()) {
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedList));
        if (newAddress.isDefault) {
          window.localStorage.setItem(DEFAULT_ADDR_KEY, newAddress.id);
        }
      } catch {
        // ignore storage quota error
      }
    }
  },

  replaceLocal(oldId: string, item: SavedAddress): void {
    const list = this.getAddresses();
    const updatedList = list.map((a) => (a.id === oldId ? item : a));
    inMemoryAddresses = updatedList;
    if (inMemoryDefaultId === oldId) {
      inMemoryDefaultId = item.id;
    }
    if (isBrowser()) {
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedList));
        if (item.isDefault) {
          window.localStorage.setItem(DEFAULT_ADDR_KEY, item.id);
        }
      } catch {
        // ignore: localStorage quota or unavailable (offline cache)
      }
    }
  },

  deleteLocal(id: string): void {
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

  setLocalDefault(id: string): void {
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

  async saveAddress(addr: Omit<SavedAddress, 'id'> & { id?: string }): Promise<SavedAddress> {
    const tempId = addr.id || `addr_${Date.now()}_${secureRandomIdSuffix(8)}`;
    const localAddress: SavedAddress = {
      ...addr,
      id: tempId,
    };
    this.persistLocal(localAddress);

    try {
      const res = await httpClient.post<any>('/users/me/addresses', {
        label: addr.label,
        address: addr.address,
        latitude: addr.latitude ?? 10.7769,
        longitude: addr.longitude ?? 106.7009,
        isDefault: Boolean(addr.isDefault),
      });
      if (res && res.id) {
        const realAddress: SavedAddress = {
          ...localAddress,
          id: res.id,
          label: res.label ?? localAddress.label,
          address: res.address ?? localAddress.address,
          latitude: typeof res.latitude === 'number' ? res.latitude : localAddress.latitude,
          longitude: typeof res.longitude === 'number' ? res.longitude : localAddress.longitude,
          isDefault: typeof res.isDefault === 'boolean' ? res.isDefault : localAddress.isDefault,
        };
        this.replaceLocal(tempId, realAddress);
        return realAddress;
      }
    } catch {
      // Offline fallback: keep localAddress
    }

    return localAddress;
  },

  async setDefaultAddress(id: string): Promise<void> {
    this.setLocalDefault(id);
    try {
      await httpClient.patch(`/users/me/addresses/${id}/default`);
    } catch {
      // offline fallback
    }
  },

  async deleteAddress(id: string): Promise<void> {
    this.deleteLocal(id);
    try {
      await httpClient.delete(`/users/me/addresses/${id}`);
    } catch {
      // offline fallback
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
