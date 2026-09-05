import { describe, expect, it, beforeEach } from '@jest/globals';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { addressStore } from './address-store';

describe('addressStore', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('returns an empty list when nothing has been saved', async () => {
    await expect(addressStore.getAddresses()).resolves.toEqual([]);
    await expect(addressStore.getDefaultAddress()).resolves.toBeNull();
  });

  it('persists a saved address and returns it as the default', async () => {
    const saved = await addressStore.saveAddress({
      label: 'Kho Quận 7',
      address: '123 Huỳnh Tấn Phát, Quận 7',
      contactName: 'Nguyễn A',
      contactPhone: '0900000001',
      isDefault: true,
    });

    expect(saved.id).toBeTruthy();
    await expect(addressStore.getAddresses()).resolves.toHaveLength(1);
    await expect(addressStore.getDefaultAddress()).resolves.toMatchObject({
      label: 'Kho Quận 7',
      isDefault: true,
    });
  });

  it('survives being read by a fresh call (simulates app relaunch)', async () => {
    await addressStore.saveAddress({
      label: 'Văn phòng',
      address: '45 Lê Duẩn, Quận 1',
      isDefault: true,
    });

    // A second, independent read must see the same persisted data.
    const list = await addressStore.getAddresses();
    expect(list).toHaveLength(1);
    expect(list[0].label).toBe('Văn phòng');
  });

  it('setDefaultAddress moves the default flag to the given id and persists it', async () => {
    const a = await addressStore.saveAddress({ label: 'A', address: 'addr A', isDefault: true });
    const b = await addressStore.saveAddress({ label: 'B', address: 'addr B', isDefault: false });

    await addressStore.setDefaultAddress(b.id);

    await expect(addressStore.getDefaultAddress()).resolves.toMatchObject({ id: b.id });
    const list = await addressStore.getAddresses();
    expect(list.find((x) => x.id === a.id)?.isDefault).toBe(false);
  });
});
