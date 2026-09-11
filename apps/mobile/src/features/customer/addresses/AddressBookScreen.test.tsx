import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render } from '@testing-library/react-native';

import { AddressBookScreen } from './AddressBookScreen';

describe('AddressBookScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.setTimeout(30000);
  });

  it('renders initial address list with default badge, contacts, and category icons', async () => {
    const screen = await render(<AddressBookScreen />);

    expect(screen.getByText('Sổ địa chỉ')).toBeTruthy();
    expect(screen.getByText('Kho trung tâm Quận 7')).toBeTruthy();
    expect(screen.getByText('Văn phòng đại diện')).toBeTruthy();
    expect(screen.getByText('Xưởng may Tân Bình')).toBeTruthy();

    // Default badge and status
    expect(screen.getByText('Mặc định')).toBeTruthy();
    expect(screen.getByText('Đang áp dụng cho đơn mới')).toBeTruthy();

    // Contact details
    expect(screen.getByText('Nguyễn Văn A')).toBeTruthy();
    expect(screen.getByText('0901234567')).toBeTruthy();

    await screen.unmount();
  }, 30000);

  it('filters addresses by category chips', async () => {
    const screen = await render(<AddressBookScreen />);

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

    await screen.unmount();
  });

  it('searches addresses by query in realtime and allows clearing', async () => {
    const screen = await render(<AddressBookScreen />);

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

    await screen.unmount();
  });

  it('opens add address form, fills details, and saves new address', async () => {
    const screen = await render(<AddressBookScreen />);

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

    // Form closed and new address rendered
    expect(screen.queryByText('Thêm địa chỉ mới')).toBeNull();
    expect(screen.getByText('Kho Long An B1')).toBeTruthy();
    expect(screen.getByText('KCN Đức Hòa, Long An')).toBeTruthy();
    expect(screen.getByText('Bùi Văn D')).toBeTruthy();
    expect(screen.getByText('0933333333')).toBeTruthy();

    await screen.unmount();
  });

  it('changes default address when set as default is pressed', async () => {
    const screen = await render(<AddressBookScreen />);

    // Press set as default on 'Văn phòng đại diện'
    const setDefaultBtn = screen.getByLabelText('Đặt Văn phòng đại diện làm mặc định');
    await fireEvent.press(setDefaultBtn);

    // 'Văn phòng đại diện' is now default
    expect(screen.getByText('Đang áp dụng cho đơn mới')).toBeTruthy();
    // 'Kho trung tâm Quận 7' now has button to set as default
    expect(screen.getByLabelText('Đặt Kho trung tâm Quận 7 làm mặc định')).toBeTruthy();

    await screen.unmount();
  });

  it('deletes an address from the list', async () => {
    const screen = await render(<AddressBookScreen />);

    expect(screen.getByText('Xưởng may Tân Bình')).toBeTruthy();

    const deleteBtn = screen.getByLabelText('Xóa Xưởng may Tân Bình');
    await fireEvent.press(deleteBtn);

    expect(screen.queryByText('Xưởng may Tân Bình')).toBeNull();

    await screen.unmount();
  });

  it('shows empty search state when no address matches the query', async () => {
    const screen = await render(<AddressBookScreen />);

    const searchInput = screen.getByLabelText('Tìm kiếm địa chỉ');
    await fireEvent.changeText(searchInput, 'XYZNonExistentKeyword');

    expect(screen.getByText('Không tìm thấy địa chỉ phù hợp')).toBeTruthy();
    expect(screen.getByText('Xem tất cả địa chỉ')).toBeTruthy();

    // Reset via empty state button
    const resetBtn = screen.getByLabelText('Xóa bộ lọc');
    await fireEvent.press(resetBtn);

    expect(screen.getByText('Kho trung tâm Quận 7')).toBeTruthy();

    await screen.unmount();
  });

  it('renders interactive map pin when adding address and toggles map preview on card', async () => {
    const screen = await render(<AddressBookScreen />);

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

    await screen.unmount();
  });
});
