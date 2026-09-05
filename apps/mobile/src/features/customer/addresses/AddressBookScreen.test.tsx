import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { AddressBookScreen } from './AddressBookScreen';
import { addressStore, type SavedAddress } from './address-store';

jest.mock('./address-store', () => {
  interface MockSavedAddress {
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

  let addresses: MockSavedAddress[] = [];
  let nextId = 1;

  return {
    addressStore: {
      getAddresses: jest.fn(() => Promise.resolve(addresses)),
      saveAddress: jest.fn((addr: Omit<MockSavedAddress, 'id'> & { id?: string }) => {
        const id = addr.id ?? `mock-addr-${nextId++}`;
        const newAddress: MockSavedAddress = { ...addr, id };
        addresses = newAddress.isDefault
          ? [newAddress, ...addresses.map((a) => ({ ...a, isDefault: false }))]
          : [newAddress, ...addresses.filter((a) => a.id !== id)];
        return Promise.resolve(newAddress);
      }),
      setDefaultAddress: jest.fn((id: string) => {
        addresses = addresses.map((a) => ({ ...a, isDefault: a.id === id }));
        return Promise.resolve();
      }),
      deleteAddress: jest.fn((id: string) => {
        addresses = addresses.filter((a) => a.id !== id);
        return Promise.resolve();
      }),
      // Test-only helper: not part of the real addressStore API. Lets each
      // test seed the fake persisted list before the component mounts,
      // mirroring how the real store is backed by AsyncStorage.
      __seed: (list: MockSavedAddress[]) => {
        addresses = list;
      },
    },
  };
});

type MockedAddressStore = typeof addressStore & {
  __seed: (list: SavedAddress[]) => void;
};

const mockedAddressStore = addressStore as MockedAddressStore;

// The screen's initial mount renders three full address cards (icons, contact
// pills, map-pin toggles), which is measurably slower than RNTL's default
// waitFor timeout (1000ms) once this whole suite is warmed up alongside other
// test files. Give the first render generous headroom to avoid flaking.
const INITIAL_LOAD_TIMEOUT = 5000;

const FIXTURE_ADDRESSES: SavedAddress[] = [
  {
    id: 'addr-1',
    label: 'Kho trung tâm Quận 7',
    address: '123 Đường Huỳnh Tấn Phát, Phường Tân Phú, Quận 7, TP.HCM',
    contactName: 'Nguyễn Văn A',
    contactPhone: '0901234567',
    isDefault: true,
    category: 'WAREHOUSE',
  },
  {
    id: 'addr-2',
    label: 'Văn phòng đại diện',
    address: '45 Lê Duẩn, Phường Bến Nghé, Quận 1, TP.HCM',
    contactName: 'Trần Thị B',
    contactPhone: '0912345678',
    isDefault: false,
    category: 'OFFICE',
  },
  {
    id: 'addr-3',
    label: 'Xưởng may Tân Bình',
    address: '78 Trường Chinh, Phường 12, Quận Tân Bình, TP.HCM',
    contactName: 'Lê Văn C',
    contactPhone: '0987654321',
    isDefault: false,
    category: 'WAREHOUSE',
  },
];

describe('AddressBookScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reseed a fresh copy of the fixture list before every test so mutations
    // (add/delete/set-default) in one test never leak into the next.
    mockedAddressStore.__seed(FIXTURE_ADDRESSES.map((a) => ({ ...a })));
  });

  it('renders initial address list with default badge, contacts, and category icons', async () => {
    render(<AddressBookScreen />);

    await waitFor(
      () => {
        expect(screen.getByText('Kho trung tâm Quận 7')).toBeTruthy();
      },
      { timeout: INITIAL_LOAD_TIMEOUT },
    );
    expect(screen.getByText('Sổ địa chỉ')).toBeTruthy();
    expect(screen.getByText('Văn phòng đại diện')).toBeTruthy();
    expect(screen.getByText('Xưởng may Tân Bình')).toBeTruthy();

    // Default badge and status
    expect(screen.getByText('Mặc định')).toBeTruthy();
    expect(screen.getByText('✓ Đang áp dụng cho đơn mới')).toBeTruthy();

    // Contact details
    expect(screen.getByText('Nguyễn Văn A')).toBeTruthy();
    expect(screen.getByText('0901234567')).toBeTruthy();
  });

  it('filters addresses by category chips', async () => {
    render(<AddressBookScreen />);
    await waitFor(() => expect(screen.getByText('Kho trung tâm Quận 7')).toBeTruthy(), {
      timeout: INITIAL_LOAD_TIMEOUT,
    });

    // Filter by 'Văn phòng'
    const officeChip = screen.getByLabelText('Văn phòng');
    await fireEvent.press(officeChip);

    await waitFor(() => {
      expect(screen.queryByText('Kho trung tâm Quận 7')).toBeNull();
    });
    expect(screen.getByText('Văn phòng đại diện')).toBeTruthy();
    expect(screen.queryByText('Xưởng may Tân Bình')).toBeNull();

    // Filter back to 'Tất cả'
    const allChip = screen.getByLabelText('Tất cả địa chỉ');
    await fireEvent.press(allChip);

    await waitFor(() => {
      expect(screen.getByText('Kho trung tâm Quận 7')).toBeTruthy();
    });
    expect(screen.getByText('Văn phòng đại diện')).toBeTruthy();
    expect(screen.getByText('Xưởng may Tân Bình')).toBeTruthy();
  });

  it('searches addresses by query in realtime and allows clearing', async () => {
    render(<AddressBookScreen />);
    await waitFor(() => expect(screen.getByText('Kho trung tâm Quận 7')).toBeTruthy(), {
      timeout: INITIAL_LOAD_TIMEOUT,
    });

    const searchInput = screen.getByLabelText('Tìm kiếm địa chỉ');
    await fireEvent.changeText(searchInput, 'Tân Bình');

    await waitFor(() => {
      expect(screen.queryByText('Kho trung tâm Quận 7')).toBeNull();
    });
    expect(screen.getByText('Xưởng may Tân Bình')).toBeTruthy();
    expect(screen.queryByText('Văn phòng đại diện')).toBeNull();

    // Clear search
    const clearBtn = screen.getByLabelText('Xóa tìm kiếm');
    await fireEvent.press(clearBtn);

    await waitFor(() => {
      expect(screen.getByText('Kho trung tâm Quận 7')).toBeTruthy();
    });
    expect(screen.getByText('Văn phòng đại diện')).toBeTruthy();
  });

  it('opens add address form, fills details, and saves new address', async () => {
    render(<AddressBookScreen />);
    await waitFor(() => expect(screen.getByText('Kho trung tâm Quận 7')).toBeTruthy(), {
      timeout: INITIAL_LOAD_TIMEOUT,
    });

    // Open form
    const addBtn = screen.getByLabelText('+ Thêm mới');
    await fireEvent.press(addBtn);

    expect(screen.getByText('Thêm địa chỉ mới')).toBeTruthy();

    // Fill fields
    const nameInput = screen.getByLabelText(/Tên gợi nhớ/);
    const addressInput = screen.getByLabelText('Địa chỉ chi tiết');
    const contactInput = screen.getByLabelText('Tên người liên hệ');
    const phoneInput = screen.getByLabelText('Số điện thoại');

    await fireEvent.changeText(nameInput, 'Kho Long An B1');
    await fireEvent.changeText(addressInput, 'KCN Đức Hòa, Long An');
    await fireEvent.changeText(contactInput, 'Bùi Văn D');
    await fireEvent.changeText(phoneInput, '0933333333');

    // Select category 'Nhà riêng'
    const homeCat = screen.getByLabelText('Nhà riêng');
    await fireEvent.press(homeCat);

    // Save
    const saveBtn = screen.getByRole('button', { name: 'Lưu địa chỉ vào sổ' });
    await fireEvent.press(saveBtn);

    // Form closed and new address rendered (async: goes through addressStore)
    await waitFor(() => {
      expect(screen.queryByText('Thêm địa chỉ mới')).toBeNull();
    });
    expect(screen.getByText('Kho Long An B1')).toBeTruthy();
    expect(screen.getByText('KCN Đức Hòa, Long An')).toBeTruthy();
    expect(screen.getByText('Bùi Văn D')).toBeTruthy();
    expect(screen.getByText('0933333333')).toBeTruthy();
  });

  it('changes default address when set as default is pressed', async () => {
    render(<AddressBookScreen />);
    await waitFor(() => expect(screen.getByText('Kho trung tâm Quận 7')).toBeTruthy(), {
      timeout: INITIAL_LOAD_TIMEOUT,
    });

    // Press set as default on 'Văn phòng đại diện'
    const setDefaultBtn = screen.getByLabelText('Đặt Văn phòng đại diện làm mặc định');
    await fireEvent.press(setDefaultBtn);

    // 'Văn phòng đại diện' is now default; 'Kho trung tâm Quận 7' now has the
    // "set as default" action instead of the default note.
    await waitFor(() => {
      expect(screen.getByLabelText('Đặt Kho trung tâm Quận 7 làm mặc định')).toBeTruthy();
    });
    expect(screen.getByText('✓ Đang áp dụng cho đơn mới')).toBeTruthy();
  });

  it('deletes an address from the list', async () => {
    render(<AddressBookScreen />);
    await waitFor(() => expect(screen.getByText('Xưởng may Tân Bình')).toBeTruthy(), {
      timeout: INITIAL_LOAD_TIMEOUT,
    });

    const deleteBtn = screen.getByLabelText('Xóa Xưởng may Tân Bình');
    await fireEvent.press(deleteBtn);

    await waitFor(() => {
      expect(screen.queryByText('Xưởng may Tân Bình')).toBeNull();
    });
  });

  it('shows empty search state when no address matches the query', async () => {
    render(<AddressBookScreen />);
    await waitFor(() => expect(screen.getByText('Kho trung tâm Quận 7')).toBeTruthy(), {
      timeout: INITIAL_LOAD_TIMEOUT,
    });

    const searchInput = screen.getByLabelText('Tìm kiếm địa chỉ');
    await fireEvent.changeText(searchInput, 'XYZNonExistentKeyword');

    await waitFor(() => {
      expect(screen.getByText('Không tìm thấy địa chỉ phù hợp')).toBeTruthy();
    });
    expect(screen.getByText('Xem tất cả địa chỉ')).toBeTruthy();

    // Reset via empty state button
    const resetBtn = screen.getByLabelText('Xóa bộ lọc');
    await fireEvent.press(resetBtn);

    await waitFor(() => {
      expect(screen.getByText('Kho trung tâm Quận 7')).toBeTruthy();
    });
  });

  it('renders interactive map pin when adding address and toggles map preview on card', async () => {
    render(<AddressBookScreen />);
    await waitFor(() => expect(screen.getByText('Kho trung tâm Quận 7')).toBeTruthy(), {
      timeout: INITIAL_LOAD_TIMEOUT,
    });

    // Toggle map preview on first card
    const toggleMapBtn = screen.getByLabelText('Xem bản đồ Kho trung tâm Quận 7');
    expect(toggleMapBtn).toBeTruthy();
    await fireEvent.press(toggleMapBtn);

    // Map preview now open
    await waitFor(() => {
      expect(screen.getByText('Ẩn bản đồ')).toBeTruthy();
    });
    expect(screen.getByTestId('real-interactive-map')).toBeTruthy();

    // Toggle close
    await fireEvent.press(toggleMapBtn);
    await waitFor(() => {
      expect(screen.getAllByText('Bản đồ').length).toBeGreaterThan(0);
    });

    // Open add address form
    const addBtn = screen.getByLabelText('+ Thêm mới');
    await fireEvent.press(addBtn);

    await waitFor(() => {
      expect(screen.getByText('Định vị trên bản đồ')).toBeTruthy();
    });
    expect(screen.getByText('Chạm hoặc kéo ghim để chỉnh')).toBeTruthy();
    expect(screen.getByTestId('real-interactive-map')).toBeTruthy();
  });

  it('renders addresses loaded from addressStore, not a hardcoded list', async () => {
    (addressStore.getAddresses as jest.Mock<any>).mockResolvedValueOnce([
      {
        id: 'a1',
        label: 'Kho Quận 7',
        address: '123 Huỳnh Tấn Phát',
        contactName: 'Nguyễn A',
        contactPhone: '0900000001',
        isDefault: true,
        category: 'WAREHOUSE',
      },
    ]);

    render(<AddressBookScreen />);

    await waitFor(
      () => {
        expect(screen.getByText('Kho Quận 7')).toBeTruthy();
      },
      { timeout: INITIAL_LOAD_TIMEOUT },
    );
    expect(screen.queryByText('Văn phòng đại diện')).toBeNull(); // old mock entry must be gone
  });

  it('shows an empty state when no addresses are saved', async () => {
    (addressStore.getAddresses as jest.Mock<any>).mockResolvedValueOnce([]);

    render(<AddressBookScreen />);

    await waitFor(
      () => {
        expect(screen.getByText(/chưa có địa chỉ/i)).toBeTruthy();
      },
      { timeout: INITIAL_LOAD_TIMEOUT },
    );
  });
});
