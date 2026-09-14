import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, waitFor } from '@testing-library/react-native';

import { httpClient } from '@leopard/mobile-core/src/api/http-client';
import { AddressBookScreen } from './AddressBookScreen';
import { addressStore } from './address-store';

jest.mock('@leopard/mobile-core/src/api/http-client', () => ({
  httpClient: {
    get: jest.fn(),
    post: jest.fn(),
    delete: jest.fn(),
    patch: jest.fn(),
  },
}));

const mockAddressesApi = [
  {
    id: 'addr-1',
    label: 'Kho trung tâm Quận 7',
    address: '123 Đường Huỳnh Tấn Phát, Phường Tân Phú, Quận 7, TP.HCM',
    contactName: 'Nguyễn Văn A',
    contactPhone: '0901234567',
    isDefault: true,
    category: 'WAREHOUSE',
    latitude: 10.73,
    longitude: 106.72,
  },
  {
    id: 'addr-2',
    label: 'Văn phòng đại diện',
    address: '45 Lê Duẩn, Phường Bến Nghé, Quận 1, TP.HCM',
    contactName: 'Trần Thị B',
    contactPhone: '0912345678',
    isDefault: false,
    category: 'OFFICE',
    latitude: 10.78,
    longitude: 106.70,
  },
  {
    id: 'addr-3',
    label: 'Xưởng may Tân Bình',
    address: '78 Trường Chinh, Phường 12, Quận Tân Bình, TP.HCM',
    contactName: 'Lê Văn C',
    contactPhone: '0987654321',
    isDefault: false,
    category: 'WAREHOUSE',
    latitude: 10.79,
    longitude: 106.65,
  },
];

describe('AddressBookScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.setTimeout(30000);
    addressStore.clearAll();
    (httpClient.get as any).mockResolvedValue(mockAddressesApi);
    (httpClient.post as any).mockImplementation(async (_path: string, body: any) => ({
      id: 'addr-new-1',
      ...body,
    }));
    (httpClient.delete as any).mockResolvedValue({ success: true });
    (httpClient.patch as any).mockResolvedValue({ success: true });
  });

  it('renders initial address list from cloud API with default badge, contacts, and category icons', async () => {
    const screen = await render(<AddressBookScreen />);

    await waitFor(() => {
      expect((httpClient.get as any)).toHaveBeenCalledWith('/users/me/addresses');
      expect(screen.getByText('Sổ địa chỉ')).toBeTruthy();
      expect(screen.getByText('Kho trung tâm Quận 7')).toBeTruthy();
      expect(screen.getByText('Văn phòng đại diện')).toBeTruthy();
      expect(screen.getByText('Xưởng may Tân Bình')).toBeTruthy();
    });

    // Default badge and status
    expect(screen.getByText('Mặc định')).toBeTruthy();
    expect(screen.getByText('Đang áp dụng cho đơn mới')).toBeTruthy();

    // Contact details
    expect(screen.getByText('Nguyễn Văn A')).toBeTruthy();
    expect(screen.getByText('0901234567')).toBeTruthy();

    screen.unmount();
  }, 30000);

  it('filters addresses by category chips', async () => {
    const screen = await render(<AddressBookScreen />);

    await waitFor(() => {
      expect(screen.getByText('Kho trung tâm Quận 7')).toBeTruthy();
    });

    // Filter by 'Văn phòng'
    const officeChip = screen.getByLabelText('Văn phòng');
    await fireEvent.press(officeChip);

    expect(screen.getByText('Văn phòng đại diện')).toBeTruthy();
    expect(screen.queryByText('Kho trung tâm Quận 7')).toBeNull();
    expect(screen.queryByText('Xưởng may Tân Bình')).toBeNull();

    // Filter back to 'Tất cả'
    const allChip = screen.getByLabelText('Tất cả địa chỉ');
    await fireEvent.press(allChip);

    expect(screen.getByText('Kho trung tâm Quận 7')).toBeTruthy();
    expect(screen.getByText('Văn phòng đại diện')).toBeTruthy();
    expect(screen.getByText('Xưởng may Tân Bình')).toBeTruthy();

    screen.unmount();
  });

  it('searches addresses by query in realtime and allows clearing', async () => {
    const screen = await render(<AddressBookScreen />);

    await waitFor(() => {
      expect(screen.getByText('Kho trung tâm Quận 7')).toBeTruthy();
    });

    const searchInput = screen.getByLabelText('Tìm kiếm địa chỉ');
    await fireEvent.changeText(searchInput, 'Tân Bình');

    expect(screen.getByText('Xưởng may Tân Bình')).toBeTruthy();
    expect(screen.queryByText('Kho trung tâm Quận 7')).toBeNull();
    expect(screen.queryByText('Văn phòng đại diện')).toBeNull();

    // Clear search
    const clearBtn = screen.getByLabelText('Xóa tìm kiếm');
    await fireEvent.press(clearBtn);

    expect(screen.getByText('Kho trung tâm Quận 7')).toBeTruthy();
    expect(screen.getByText('Văn phòng đại diện')).toBeTruthy();

    screen.unmount();
  });

  it('opens add address form, fills details, and saves new address via POST API', async () => {
    const screen = await render(<AddressBookScreen />);

    await waitFor(() => {
      expect(screen.getByText('Kho trung tâm Quận 7')).toBeTruthy();
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

    await waitFor(() => {
      expect((httpClient.post as any)).toHaveBeenCalledWith(
        '/users/me/addresses',
        expect.objectContaining({
          label: 'Kho Long An B1',
          address: 'KCN Đức Hòa, Long An',
        }),
      );
      expect(screen.queryByText('Thêm địa chỉ mới')).toBeNull();
      expect(screen.getByText('Kho Long An B1')).toBeTruthy();
      expect(screen.getByText('KCN Đức Hòa, Long An')).toBeTruthy();
      expect(screen.getByText('Bùi Văn D')).toBeTruthy();
      expect(screen.getByText('0933333333')).toBeTruthy();
    });

    screen.unmount();
  });

  it('changes default address and calls PATCH API when set as default is pressed', async () => {
    const screen = await render(<AddressBookScreen />);

    await waitFor(() => {
      expect(screen.getByText('Kho trung tâm Quận 7')).toBeTruthy();
    });

    // Press set as default on 'Văn phòng đại diện'
    const setDefaultBtn = screen.getByLabelText('Đặt Văn phòng đại diện làm mặc định');
    await fireEvent.press(setDefaultBtn);

    await waitFor(() => {
      expect((httpClient.patch as any)).toHaveBeenCalledWith(
        '/users/me/addresses/addr-2/default',
      );
      expect(screen.getByText('Đang áp dụng cho đơn mới')).toBeTruthy();
    });

    expect(screen.getByLabelText('Đặt Kho trung tâm Quận 7 làm mặc định')).toBeTruthy();

    screen.unmount();
  });

  it('deletes an address from the list and calls DELETE API', async () => {
    const screen = await render(<AddressBookScreen />);

    await waitFor(() => {
      expect(screen.getByText('Xưởng may Tân Bình')).toBeTruthy();
    });

    const deleteBtn = screen.getByLabelText('Xóa Xưởng may Tân Bình');
    await fireEvent.press(deleteBtn);

    await waitFor(() => {
      expect((httpClient.delete as any)).toHaveBeenCalledWith('/users/me/addresses/addr-3');
      expect(screen.queryByText('Xưởng may Tân Bình')).toBeNull();
    });

    screen.unmount();
  });

  it('shows empty search state when no address matches the query', async () => {
    const screen = await render(<AddressBookScreen />);

    await waitFor(() => {
      expect(screen.getByText('Kho trung tâm Quận 7')).toBeTruthy();
    });

    const searchInput = screen.getByLabelText('Tìm kiếm địa chỉ');
    await fireEvent.changeText(searchInput, 'XYZNonExistentKeyword');

    expect(screen.getByText('Không tìm thấy địa chỉ phù hợp')).toBeTruthy();
    expect(screen.getByText('Xem tất cả địa chỉ')).toBeTruthy();

    // Reset via empty state button
    const resetBtn = screen.getByLabelText('Xóa bộ lọc');
    await fireEvent.press(resetBtn);

    expect(screen.getByText('Kho trung tâm Quận 7')).toBeTruthy();

    screen.unmount();
  });

  it('renders interactive map pin when adding address and toggles map preview on card', async () => {
    const screen = await render(<AddressBookScreen />);

    await waitFor(() => {
      expect(screen.getByText('Kho trung tâm Quận 7')).toBeTruthy();
    });

    // Toggle map preview on first card
    const toggleMapBtn = screen.getByLabelText('Xem bản đồ Kho trung tâm Quận 7');
    expect(toggleMapBtn).toBeTruthy();
    await fireEvent.press(toggleMapBtn);

    // Map preview now open
    expect(screen.getByText('Ẩn bản đồ')).toBeTruthy();
    expect(screen.getByTestId('real-interactive-map')).toBeTruthy();

    // Toggle close
    await fireEvent.press(toggleMapBtn);
    expect(screen.getAllByText('Bản đồ').length).toBeGreaterThan(0);

    // Open add address form
    const addBtn = screen.getByLabelText('+ Thêm mới');
    await fireEvent.press(addBtn);

    expect(screen.getByText('Định vị trên bản đồ')).toBeTruthy();
    expect(screen.getByText('Chạm hoặc kéo ghim để chỉnh')).toBeTruthy();
    expect(screen.getByTestId('real-interactive-map')).toBeTruthy();

    screen.unmount();
  });
});
