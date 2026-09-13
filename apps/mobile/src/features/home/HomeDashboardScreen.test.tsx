import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render } from '@testing-library/react-native';

import { addressStore } from '../customer/addresses/address-store';
import { getTimeOfDayGreeting, HomeDashboardScreen } from './HomeDashboardScreen';

const activeShipment = {
  orderId: 'ord-active-1',
  status: 'IN_TRANSIT' as const,
  origin: 'Kho Tân Bình',
  destination: 'KCN Tân Tạo',
  cargoNote: '1.2 tấn xi măng',
  driverName: 'Nguyễn Văn Hùng',
  plate: '59C-882.14',
  etaMinutes: 18,
};

const recentOrders = [
  {
    id: 'ord-2',
    reference: 'LP-240902',
    status: 'DELIVERED' as const,
    origin: 'Quận 7',
    destination: 'Thủ Đức',
    price: '420.000 ₫',
    updated: 'Hôm qua',
  },
  {
    id: 'ord-3',
    reference: 'LP-240831',
    status: 'REQUESTED' as const,
    origin: 'Bình Tân',
    destination: 'Long An',
    price: '650.000 ₫',
    updated: '31/08',
  },
];

describe('HomeDashboardScreen', () => {
  beforeEach(() => {
    addressStore.clearAll();
  });
  it('surfaces operational work first and wires the primary actions', async () => {
    const onCreateOrder = jest.fn();
    const onOpenActiveOrder = jest.fn();
    const onOpenOrder = jest.fn();
    const onViewAllOrders = jest.fn();
    const onOpenNotifications = jest.fn();
    const onSwitchRole = jest.fn();
    const onSelectVehicleAndBook = jest.fn();
    const onTopUpWallet = jest.fn();
    const onOpenQrScan = jest.fn();

    const screen = await render(
      <HomeDashboardScreen
        activeShipment={activeShipment}
        onCreateOrder={onCreateOrder}
        onOpenActiveOrder={onOpenActiveOrder}
        onOpenNotifications={onOpenNotifications}
        onOpenOrder={onOpenOrder}
        onOpenQrScan={onOpenQrScan}
        onSelectVehicleAndBook={onSelectVehicleAndBook}
        onSwitchRole={onSwitchRole}
        onTopUpWallet={onTopUpWallet}
        onViewAllOrders={onViewAllOrders}
        recentOrders={recentOrders}
        smeName="Cửa hàng VLXD Đại Phát"
        userName="Anh Hoàng"
        walletBalance="1.850.000 ₫"
        defaultDropoffLocation="KCN Tân Tạo"
      />,
    );

    // Header identity
    expect(screen.getByText('Cửa hàng VLXD Đại Phát')).toBeTruthy();
    expect(screen.getByText(/Anh Hoàng/)).toBeTruthy();

    // Header actions
    await fireEvent.press(screen.getByLabelText(/Thông báo/));
    expect(onOpenNotifications).toHaveBeenCalledTimes(1);
    await fireEvent.press(screen.getByLabelText('Chuyển vai trò'));
    expect(onSwitchRole).toHaveBeenCalledWith('DRIVER');

    // Fleet vehicle card jumps into order creation
    await fireEvent.press(screen.getByLabelText(/Chọn xe Xe Tải 1.25T/));
    expect(onSelectVehicleAndBook).toHaveBeenCalledWith('LIGHT_TRUCK');

    // Active shipment sits below booking: status + route + ETA, opens on press
    expect(screen.getByText('Đang vận chuyển')).toBeTruthy();
    expect(screen.getByText('Kho Tân Bình')).toBeTruthy();
    expect(screen.getByText(/18 phút/)).toBeTruthy();
    expect(screen.getByText(/59C-882\.14/)).toBeTruthy();
    await fireEvent.press(screen.getByLabelText(/Chuyến đang vận chuyển/));
    expect(onOpenActiveOrder).toHaveBeenCalledWith('ord-active-1');

    // Quick book by Ba Gác jumps into the create flow
    await fireEvent.press(screen.getByLabelText(/Chọn xe Xe Ba Gác/));
    expect(onSelectVehicleAndBook).toHaveBeenCalledWith('3_WHEEL_BIKE');

    // Wallet utility strip removed from home dashboard
    expect(screen.queryByText('Ví VietQR')).toBeNull();
    expect(screen.queryByLabelText('Nạp tiền vào ví')).toBeNull();

    // FloatingNavBar hidden by default
    expect(screen.queryByLabelText('Trang chủ')).toBeNull();

    await screen.unmount();
  }, 60000);

  it('renders calm pure booking state without noise when there is no active shipment', async () => {
    const screen = await render(
      <HomeDashboardScreen activeShipment={null} recentOrders={[]} />,
    );

    expect(screen.queryByTestId('home-active-shipments')).toBeNull();
    expect(screen.queryByText('Chưa có chuyến nào đang chạy')).toBeNull();
    expect(screen.queryByText('Bạn chưa có đơn hàng nào.')).toBeNull();
    expect(screen.getByTestId('home-booking')).toBeTruthy();

    await screen.unmount();
  });

  it('renders the floating nav bar when enabled', async () => {
    const onNavigateTab = jest.fn();
    const screen = await render(
      <HomeDashboardScreen onNavigateTab={onNavigateTab} showFloatingNavBar />,
    );

    const walletTab = screen.getByLabelText('Ví');
    expect(walletTab).toBeTruthy();
    await fireEvent.press(walletTab);
    expect(onNavigateTab).toHaveBeenCalledWith('wallet');

    await screen.unmount();
  });

  it('renders time-of-day greeting correctly', () => {
    expect(getTimeOfDayGreeting(new Date(2026, 8, 3, 8, 0))).toBe('Chào buổi sáng');
    expect(getTimeOfDayGreeting(new Date(2026, 8, 3, 14, 0))).toBe('Chào buổi chiều');
    expect(getTimeOfDayGreeting(new Date(2026, 8, 3, 20, 0))).toBe('Chào buổi tối');
  });

  it('excludes bloat driver-partner card, service duplicates and promo banners from home dashboard', async () => {
    const screen = await render(<HomeDashboardScreen />);

    expect(screen.queryByTestId('home-driver-btn')).toBeNull();
    expect(screen.queryByTestId('home-services')).toBeNull();
    expect(screen.queryByText('Đặt xe phù hợp với hàng')).toBeNull();
    expect(screen.queryByText('Lên đơn từ địa chỉ đã lưu')).toBeNull();
    expect(screen.queryByText('Gia nhập tài xế LEOPARD')).toBeNull();

    await screen.unmount();
  });

  it('submits quick route booking with custom pickup and dropoff', async () => {
    const onQuickBook = jest.fn();
    const screen = await render(
      <HomeDashboardScreen onQuickBook={onQuickBook} />,
    );

    // Default pickup location is prefilled
    expect(screen.getByDisplayValue('Kho Tân Bình, TP. Hồ Chí Minh')).toBeTruthy();

    // Type a destination and submit via Big CTA button
    await fireEvent.changeText(
       screen.getByPlaceholderText('Bạn muốn giao hàng đến đâu?...'),
       'KCN Sóng Thần, Bình Dương',
    );
    await fireEvent.press(screen.getByText(/TIẾP TỤC ĐẶT XE/));
    await new Promise((r) => setTimeout(r, 450));

    expect(onQuickBook).toHaveBeenCalledWith(
      'Kho Tân Bình, TP. Hồ Chí Minh',
      'KCN Sóng Thần, Bình Dương',
    );

    await screen.unmount();
  });

  it.each([
    { shipment: activeShipment, shouldShow: true },
    { shipment: null, shouldShow: false },
  ])('handles active shipment with progressive disclosure ($shouldShow)', async ({ shipment, shouldShow }) => {
    const screen = await render(<HomeDashboardScreen activeShipment={shipment} />);
    expect(screen.getByTestId('home-booking')).toBeTruthy();
    if (shouldShow) {
      expect(screen.getByTestId('home-active-shipments')).toBeTruthy();
      expect(screen.getByLabelText(/Chuyến đang vận chuyển/)).toBeTruthy();
    } else {
      expect(screen.queryByTestId('home-active-shipments')).toBeNull();
    }

    await screen.unmount();
  });

  it('connects fleet matrix vehicles to booking flow', async () => {
    const onSelectVehicleAndBook = jest.fn();
    const screen = await render(
      <HomeDashboardScreen onSelectVehicleAndBook={onSelectVehicleAndBook} defaultDropoffLocation="KCN Tân Tạo" />,
    );

    for (const [name, category] of [
      ['Van 500kg', 'LIGHT_TRUCK'],
      ['Xe Tải 1.25T', 'LIGHT_TRUCK'],
      ['Xe Tải 2.5T', 'HEAVY_TRUCK'],
      ['Xe Ba Gác', '3_WHEEL_BIKE'],
    ] as const) {
      await fireEvent.press(screen.getByLabelText(new RegExp(`Chọn xe ${name}`)));
      expect(onSelectVehicleAndBook).toHaveBeenLastCalledWith(category);
    }
    expect(onSelectVehicleAndBook).toHaveBeenCalledTimes(4);

    await screen.unmount();
  });

  it('loads customer confirmed address from addressStore into pickup input with label', async () => {
    addressStore.saveAddress({
      label: 'Kho hàng',
      address: '120 Trường Chinh, Phường 12, Quận Tân Bình, TP. Hồ Chí Minh',
      isDefault: true,
      category: 'WAREHOUSE',
    });

    const screen = await render(<HomeDashboardScreen />);

    // Renders the saved warehouse address
    expect(
      screen.getByDisplayValue('120 Trường Chinh, Phường 12, Quận Tân Bình, TP. Hồ Chí Minh'),
    ).toBeTruthy();
    expect(screen.getAllByText('Kho hàng').length).toBeGreaterThanOrEqual(1);

    await screen.unmount();
  });

  it('allows switching pickup location when customer taps a saved address chip', async () => {
    addressStore.saveAddress({
      id: 'addr-warehouse',
      label: 'Kho hàng',
      address: 'Kho A1 - 120 Trường Chinh, Quận Tân Bình',
      isDefault: true,
      category: 'WAREHOUSE',
    });
    addressStore.saveAddress({
      id: 'addr-home',
      label: 'Nhà riêng',
      address: '135 Nam Kỳ Khởi Nghĩa, Quận 1',
      isDefault: false,
      category: 'HOME',
    });

    const onSelectSavedAddress = jest.fn();
    const screen = await render(
      <HomeDashboardScreen onSelectSavedAddress={onSelectSavedAddress} />,
    );

    // Initial default is warehouse
    expect(
      screen.getByDisplayValue('Kho A1 - 120 Trường Chinh, Quận Tân Bình'),
    ).toBeTruthy();

    // Focus on pickup input to open dropdown and pick from address book
    await fireEvent(screen.getByTestId('cr-pickup-input'), 'focus');
    await fireEvent.press(screen.getByLabelText('Chọn từ sổ địa chỉ'));

    // Tap on Nhà riêng in the modal
    const homeChip = screen.getByTestId('pickup-chip-addr-home');
    expect(homeChip).toBeTruthy();
    await fireEvent.press(homeChip);

    // Input changes to home address
    expect(
      screen.getByDisplayValue('135 Nam Kỳ Khởi Nghĩa, Quận 1'),
    ).toBeTruthy();
    expect(onSelectSavedAddress).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'addr-home', label: 'Nhà riêng' }),
    );

    await screen.unmount();
  }, 30000);

  it('supports entering address and confirming location via map picker modal', async () => {
    const screen = await render(
      <HomeDashboardScreen userName="Anh Hoàng" userPhone="0901234567" />,
    );

    // Clear pickup input
    const clearPickupBtn = screen.getByLabelText('Xóa điểm lấy hàng');
    expect(clearPickupBtn).toBeTruthy();
    await fireEvent.press(clearPickupBtn);
    expect(screen.getByPlaceholderText('Nhập địa chỉ lấy hàng...').props.value).toBe('');

    // Focus pickup input to open dropdown
    await fireEvent(screen.getByTestId('cr-pickup-input'), 'focus');

    // Tap "Xác nhận vị trí trên bản đồ"
    const mapActionBtn = screen.getByLabelText('Xác nhận vị trí trên bản đồ');
    expect(mapActionBtn).toBeTruthy();
    await fireEvent.press(mapActionBtn);

    // Map modal is shown
    expect(screen.getAllByText('Thông tin người gửi').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Lấy hàng tại')).toBeTruthy();

    // Enter real address in modal input
    const addressInput = screen.getByLabelText('Địa chỉ lấy hàng');
    expect(addressInput).toBeTruthy();
    await fireEvent.changeText(addressInput, 'Kho Tân Bình, TP. Hồ Chí Minh');

    // Test "Thay đổi" button: clears to re-enter without opening address book modal
    const changeBtn = screen.getByLabelText('Thay đổi địa chỉ');
    expect(changeBtn).toBeTruthy();
    await fireEvent.press(changeBtn);
    expect(screen.getByLabelText('Địa chỉ lấy hàng').props.value).toBe('');

    // Type final address
    await fireEvent.changeText(screen.getByLabelText('Địa chỉ lấy hàng'), '120 Trường Chinh, Quận Tân Bình');

    // Tap "Tôi là người gửi" shortcut
    await fireEvent.press(screen.getByLabelText('Tôi là người gửi'));
    expect(screen.getByDisplayValue('Anh Hoàng')).toBeTruthy();
    expect(screen.getByDisplayValue('0901234567')).toBeTruthy();

    // Tap "Lưu" to confirm
    await fireEvent.press(screen.getByLabelText('Lưu thông tin vị trí'));

    // Address is applied to pickup text
    expect(screen.getByDisplayValue('120 Trường Chinh, Quận Tân Bình')).toBeTruthy();

    await screen.unmount();
  }, 30000);

  it('supports entering destination address and filling receiver info with logged in customer', async () => {
    const screen = await render(
      <HomeDashboardScreen userName="Nguyễn Văn A" userPhone="0987654321" />,
    );

    // Click direct map pin button on dropoff input
    const dropoffMapBtn = screen.getByLabelText('Mở bản đồ chọn điểm giao');
    await fireEvent.press(dropoffMapBtn);

    // Map modal is shown for dropoff
    expect(screen.getAllByText('Thông tin người nhận').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Giao hàng đến')).toBeTruthy();

    // Enter dropoff address directly in modal
    await fireEvent.changeText(
      screen.getByLabelText('Địa chỉ giao hàng'),
      'Cảng Cát Lái, Quận 2, TP. Hồ Chí Minh',
    );

    // Tap "Tôi là người nhận"
    await fireEvent.press(screen.getByLabelText('Tôi là người nhận'));
    expect(screen.getByDisplayValue('Nguyễn Văn A')).toBeTruthy();
    expect(screen.getByDisplayValue('0987654321')).toBeTruthy();

    // Save
    await fireEvent.press(screen.getByLabelText('Lưu thông tin vị trí'));
    expect(screen.getByDisplayValue('Cảng Cát Lái, Quận 2, TP. Hồ Chí Minh')).toBeTruthy();

    await screen.unmount();
  }, 30000);

  it('supports opening map picker directly via input map pin button', async () => {
    const screen = await render(
      <HomeDashboardScreen userName="Anh Hoàng" />,
    );

    // Direct map pin button on pickup row
    const directMapBtn = screen.getByLabelText('Mở bản đồ chọn điểm lấy');
    expect(directMapBtn).toBeTruthy();
    await fireEvent.press(directMapBtn);

    // Map modal is shown immediately
    expect(screen.getAllByText('Thông tin người gửi').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Lấy hàng tại')).toBeTruthy();

    // Close map modal
    await fireEvent.press(screen.getByLabelText('Đóng màn hình bản đồ'));

    await screen.unmount();
  }, 30000);

  it('triggers quick route booking on keyboard submit editing', async () => {
    const onQuickBook = jest.fn();
    const screen = await render(
      <HomeDashboardScreen onQuickBook={onQuickBook} />,
    );

    // Default pickup is populated
    expect(screen.getByDisplayValue('Kho Tân Bình, TP. Hồ Chí Minh')).toBeTruthy();

    // Type dropoff and press enter
    await fireEvent.changeText(
      screen.getByPlaceholderText('Bạn muốn giao hàng đến đâu?...'),
      'KCN Amata, Đồng Nai',
    );
    await fireEvent(screen.getByTestId('cr-dropoff-input'), 'submitEditing');
    await new Promise((r) => setTimeout(r, 450));

    expect(onQuickBook).toHaveBeenCalledWith(
      'Kho Tân Bình, TP. Hồ Chí Minh',
      'KCN Amata, Đồng Nai',
    );

    await screen.unmount();
  });

  it('enforces single responsibility principle by keeping home focused strictly on booking', async () => {
    const screen = await render(<HomeDashboardScreen />);
    expect(screen.getByTestId('home-booking')).toBeTruthy();
    expect(screen.queryByTestId('home-recent-orders')).toBeNull();
    expect(screen.queryByLabelText('Tra cứu mã vận đơn')).toBeNull();
    await screen.unmount();
  });

  it('displays vehicle dimensions (L x W x H) and cargo capacity in fleet matrix', async () => {
    const onSelectVehicleAndBook = jest.fn();
    const screen = await render(
      <HomeDashboardScreen onSelectVehicleAndBook={onSelectVehicleAndBook} defaultDropoffLocation="KCN Tân Tạo" />,
    );
    expect(screen.getByText('3.2 x 1.6 x 1.7m')).toBeTruthy(); // Tải 1.25T
    expect(screen.getByText('2.1 x 1.3 x 1.2m')).toBeTruthy(); // Van 500kg
    expect(screen.getByText('4.3 x 1.8 x 1.9m')).toBeTruthy(); // Tải 2.5T
    expect(screen.getByText('1.8 x 1.1m')).toBeTruthy(); // Ba gác
    expect(screen.getByTestId('home-interactive-map')).toBeTruthy();
    expect(screen.getByText('ƯỚC TÍNH CƯỚC CHUYẾN')).toBeTruthy();

    // Tap CTA
    await fireEvent.press(screen.getByText(/TIẾP TỤC ĐẶT XE/));
    expect(onSelectVehicleAndBook).toHaveBeenCalledWith('LIGHT_TRUCK');

    await screen.unmount();
  });

  it('implements 4-layer map-first architecture with GestureBottomSheet snap points [0.18, 0.52, 0.92]', async () => {
    const screen = await render(
      <HomeDashboardScreen showFloatingNavBar />
    );

    // Layer 0: Full-bleed map
    const map = screen.getByTestId('home-interactive-map');
    expect(map).toBeTruthy();
    const mapContainer = screen.getByTestId('home-map-layer');
    expect(mapContainer).toBeTruthy();
    const mapStyle = [mapContainer.props.style].flat().reduce((acc: any, cur: any) => ({ ...acc, ...cur }), {});
    expect(mapStyle.zIndex).toBe(0);

    // Layer 1: Floating glass top bar
    const topBar = screen.getByTestId('home-top-bar');
    expect(topBar).toBeTruthy();
    const topBarStyle = [topBar.props.style].flat().reduce((acc: any, cur: any) => ({ ...acc, ...cur }), {});
    expect(topBarStyle.zIndex).toBe(20);

    // Layer 2: 3-snap GestureBottomSheet
    const sheet = screen.getByTestId('home-bottom-sheet');
    expect(sheet).toBeTruthy();
    expect(screen.getByTestId('home-bottom-sheet-handle')).toBeTruthy();
    expect(screen.getByTestId('home-bottom-sheet-indicator')).toBeTruthy();

    // Layer 3: FloatingNavBar with zIndex 60
    const navBar = screen.getByTestId('home-nav-dock');
    expect(navBar).toBeTruthy();
    const navStyle = [navBar.props.style].flat().reduce((acc: any, cur: any) => ({ ...acc, ...cur }), {});
    expect(navStyle.zIndex).toBe(60);

    await screen.unmount();
  });

  describe('progressive disclosure for route and fleet selection', () => {
    it('shows guiding prompt and quick hub chips when destination is not selected', async () => {
      const screen = await render(<HomeDashboardScreen />);

      // Guiding text is present
      expect(screen.getByText('Chọn điểm giao để xem giá và gọi xe')).toBeTruthy();

      // 3 quick destination warehouse chips are present
      expect(screen.getByText('Kho Tân Tạo')).toBeTruthy();
      expect(screen.getByText('Cảng Cát Lái')).toBeTruthy();
      expect(screen.getByText('KCN Sóng Thần')).toBeTruthy();

      // Fleet matrix and fare estimate are hidden
      expect(screen.queryByText('CHỌN LOẠI XE PHÙ HỢP')).toBeNull();
      expect(screen.queryByText('ƯỚC TÍNH CƯỚC CHUYẾN')).toBeNull();
      expect(screen.queryByText(/TIẾP TỤC ĐẶT XE/)).toBeNull();

      await screen.unmount();
    });

    it('reveals fleet matrix and CTA when quick destination chip is tapped', async () => {
      const screen = await render(<HomeDashboardScreen />);

      // Tap Kho Tân Tạo chip
      await fireEvent.press(screen.getByText('Kho Tân Tạo'));

      // Dropoff text is auto-filled
      expect(screen.getByDisplayValue('KCN Tân Tạo, Lô B5, Bình Tân')).toBeTruthy();

      // Guiding prompt and chips are now hidden
      expect(screen.queryByText('Chọn điểm giao để xem giá và gọi xe')).toBeNull();

      // Fleet matrix, fare estimate, and CTA button are revealed
      expect(screen.getByText('CHỌN LOẠI XE PHÙ HỢP')).toBeTruthy();
      expect(screen.getByText('ƯỚC TÍNH CƯỚC CHUYẾN')).toBeTruthy();
      expect(screen.getByText('TIẾP TỤC ĐẶT XE · 280.000 ₫ ➔')).toBeTruthy();

      await screen.unmount();
    });

    it('reveals fleet matrix and CTA when dropoff destination is typed (>= 3 chars)', async () => {
      const screen = await render(<HomeDashboardScreen />);

      // Type 2 chars -> still hidden
      await fireEvent.changeText(
        screen.getByPlaceholderText('Bạn muốn giao hàng đến đâu?...'),
        'KC',
      );
      expect(screen.getByText('Chọn điểm giao để xem giá và gọi xe')).toBeTruthy();
      expect(screen.queryByText('ƯỚC TÍNH CƯỚC CHUYẾN')).toBeNull();

      // Type 3rd char -> revealed
      await fireEvent.changeText(
        screen.getByPlaceholderText('Bạn muốn giao hàng đến đâu?...'),
        'KCN',
      );
      expect(screen.queryByText('Chọn điểm giao để xem giá và gọi xe')).toBeNull();
      expect(screen.getByText('ƯỚC TÍNH CƯỚC CHUYẾN')).toBeTruthy();
      expect(screen.getByText(/TIẾP TỤC ĐẶT XE/)).toBeTruthy();

      // Clear -> hidden again
      await fireEvent.press(screen.getByLabelText('Xóa điểm giao hàng'));
      expect(screen.getByText('Chọn điểm giao để xem giá và gọi xe')).toBeTruthy();
      expect(screen.queryByText('ƯỚC TÍNH CƯỚC CHUYẾN')).toBeNull();

      await screen.unmount();
    });

    it('auto-fills corresponding address for each quick hub chip', async () => {
      const screen = await render(<HomeDashboardScreen />);

      await fireEvent.press(screen.getByText('Cảng Cát Lái'));
      expect(screen.getByDisplayValue('Cảng Cát Lái, Quận 2, TP. Hồ Chí Minh')).toBeTruthy();

      await fireEvent.press(screen.getByLabelText('Xóa điểm giao hàng'));
      await fireEvent.press(screen.getByText('KCN Sóng Thần'));
      expect(screen.getByDisplayValue('KCN Sóng Thần, Dĩ An, Bình Dương')).toBeTruthy();

      await screen.unmount();
    });
  });
});
