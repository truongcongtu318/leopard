import AsyncStorage from '@react-native-async-storage/async-storage';

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

async function readList(): Promise<SavedAddress[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as SavedAddress[]) : [];
  } catch {
    return [];
  }
}

async function writeList(list: SavedAddress[]): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {
    // Storage quota / unavailable — the in-memory update already happened
    // for this session; next app launch will just start from empty.
  }
}

export const addressStore = {
  async getAddresses(): Promise<SavedAddress[]> {
    return readList();
  },

  async getDefaultAddress(): Promise<SavedAddress | null> {
    const list = await readList();
    if (list.length === 0) return null;

    let defaultId: string | null = null;
    try {
      defaultId = await AsyncStorage.getItem(DEFAULT_ADDR_KEY);
    } catch {
      // ignore
    }

    if (defaultId) {
      const found = list.find((a) => a.id === defaultId);
      if (found) return found;
    }

    return list.find((a) => a.isDefault) ?? list[0] ?? null;
  },

  async saveAddress(addr: Omit<SavedAddress, 'id'> & { id?: string }): Promise<SavedAddress> {
    const list = await readList();
    const id = addr.id || `addr_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const newAddress: SavedAddress = { ...addr, id };

    let updatedList: SavedAddress[];
    if (newAddress.isDefault) {
      updatedList = [newAddress, ...list.map((a) => ({ ...a, isDefault: false }))];
      await AsyncStorage.setItem(DEFAULT_ADDR_KEY, id).catch(() => {});
    } else {
      updatedList = [newAddress, ...list.filter((a) => a.id !== id)];
    }

    await writeList(updatedList);
    return newAddress;
  },

  async setDefaultAddress(id: string): Promise<void> {
    const list = await readList();
    const updatedList = list.map((a) => ({ ...a, isDefault: a.id === id }));
    await writeList(updatedList);
    await AsyncStorage.setItem(DEFAULT_ADDR_KEY, id).catch(() => {});
  },

  async clearAll(): Promise<void> {
    await AsyncStorage.removeItem(STORAGE_KEY).catch(() => {});
    await AsyncStorage.removeItem(DEFAULT_ADDR_KEY).catch(() => {});
  },
};
