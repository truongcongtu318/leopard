import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

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
      <HomeDashboardScreen
        initialCargoImageUri="file:///test-cargo.jpg"
        onQuickBook={onQuickBook}
      />,
    );

    // Default pickup location is prefilled
    expect(screen.getByDisplayValue('Kho Tân Bình, TP. Hồ Chí Minh')).toBeTruthy();

    // Type a destination and submit via Big CTA button
    await fireEvent.changeText(
       screen.getByPlaceholderText('Bạn muốn giao hàng đến đâu?...'),
       'KCN Sóng Thần, Bình Dương',
    );
    await fireEvent.press(screen.getByText(/TIẾP TỤC ĐẶT XE/));
    await fireEvent.press(screen.getByText(/XÁC NHẬN GỌI XE/));
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

    // Shows search prompt when empty (no fake hardcoded places)
    expect(screen.getByText('ĐIỂM LẤY HÀNG · GỢI Ý VỊ TRÍ')).toBeTruthy();
    expect(screen.getByText('Nhập địa chỉ hoặc tên đường để tìm kiếm...')).toBeTruthy();

    // Type query
    await fireEvent.changeText(screen.getByTestId('cr-pickup-input'), 'Cát Lái');
    expect(screen.getByText('Cảng Cát Lái')).toBeTruthy();

    // Tap a suggestion
    await fireEvent.press(screen.getByLabelText('Chọn gợi ý Cảng Cát Lái'));

    // Address is applied to pickup text
    expect(screen.getByDisplayValue('Cảng Cát Lái, Đường Nguyễn Thị Định, TP. Thủ Đức, TP. Hồ Chí Minh')).toBeTruthy();

    await screen.unmount();
  }, 30000);

  it('filters live location suggestions as customer types destination', async () => {
    const screen = await render(
      <HomeDashboardScreen />,
    );

    // Focus dropoff input
    const dropoffInput = screen.getByPlaceholderText('Bạn muốn giao hàng đến đâu?...');
    await fireEvent(dropoffInput, 'focus');
    await fireEvent.changeText(dropoffInput, 'Cát Lái');

    // Suggestions filter in real-time
    expect(screen.getByText('Cảng Cát Lái')).toBeTruthy();
    await fireEvent.press(screen.getByLabelText('Chọn gợi ý Cảng Cát Lái'));

    // Destination is updated
    expect(screen.getByDisplayValue('Cảng Cát Lái, Đường Nguyễn Thị Định, TP. Thủ Đức, TP. Hồ Chí Minh')).toBeTruthy();

    await screen.unmount();
  }, 30000);

  it('matches Vietnamese locations without accents like Google Maps', async () => {
    const screen = await render(<HomeDashboardScreen />);
    const dropoffInput = screen.getByPlaceholderText('Bạn muốn giao hàng đến đâu?...');
    await fireEvent(dropoffInput, 'focus');
    await fireEvent.changeText(dropoffInput, 'cong hoa');

    expect(screen.getByText('Đường Cộng Hòa')).toBeTruthy();
    await fireEvent.press(screen.getByLabelText('Chọn gợi ý Đường Cộng Hòa'));

    expect(screen.getByDisplayValue('Đường Cộng Hòa, Phường 13, Quận Tân Bình, TP. Hồ Chí Minh')).toBeTruthy();

    await screen.unmount();
  }, 30000);

  it('keeps input rows clean without redundant map picker buttons', async () => {
    const screen = await render(
      <HomeDashboardScreen userName="Anh Hoàng" />,
    );

    // Redundant map pin button inside input row is eliminated
    expect(screen.queryByLabelText('Mở bản đồ chọn điểm lấy')).toBeNull();
    expect(screen.queryByLabelText('Mở bản đồ chọn điểm giao')).toBeNull();

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
    it('shows guiding prompt when destination is not selected and hides fleet matrix', async () => {
      const screen = await render(<HomeDashboardScreen />);

      // Guiding text is present
      expect(screen.getByText('Nhập địa chỉ giao hàng để tính giá cước và gọi xe')).toBeTruthy();

      // Fleet matrix and fare estimate are hidden
      expect(screen.queryByText('CHỌN LOẠI XE PHÙ HỢP')).toBeNull();
      expect(screen.queryByText('ƯỚC TÍNH CƯỚC CHUYẾN')).toBeNull();
      expect(screen.queryByText(/TIẾP TỤC ĐẶT XE/)).toBeNull();

      await screen.unmount();
    });

    it('reveals fleet matrix and CTA when saved address chip is tapped', async () => {
      const screen = await render(
        <HomeDashboardScreen
          savedAddresses={[
            {
              id: 'addr-cat-lai',
              label: 'Cảng Cát Lái',
              address: 'Cảng Cát Lái, Quận 2, TP. Hồ Chí Minh',
              isDefault: false,
              category: 'WAREHOUSE',
            },
          ]}
        />,
      );

      // Tap saved warehouse chip
      await fireEvent.press(screen.getByText('Cảng Cát Lái'));

      // Dropoff text is auto-filled
      expect(screen.getByDisplayValue('Cảng Cát Lái, Quận 2, TP. Hồ Chí Minh')).toBeTruthy();

      // Guiding prompt is now hidden
      expect(screen.queryByText('Nhập địa chỉ giao hàng để tính giá cước và gọi xe')).toBeNull();

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
      expect(screen.getByText('Nhập địa chỉ giao hàng để tính giá cước và gọi xe')).toBeTruthy();
      expect(screen.queryByText('ƯỚC TÍNH CƯỚC CHUYẾN')).toBeNull();

      // Type 3rd char -> revealed
      await fireEvent.changeText(
        screen.getByPlaceholderText('Bạn muốn giao hàng đến đâu?...'),
        'KCN',
      );
      expect(screen.queryByText('Nhập địa chỉ giao hàng để tính giá cước và gọi xe')).toBeNull();
      expect(screen.getByText('ƯỚC TÍNH CƯỚC CHUYẾN')).toBeTruthy();
      expect(screen.getByText(/TIẾP TỤC ĐẶT XE/)).toBeTruthy();

      // Clear -> hidden again
      await fireEvent.press(screen.getByLabelText('Xóa điểm giao hàng'));
      expect(screen.getByText('Nhập địa chỉ giao hàng để tính giá cước và gọi xe')).toBeTruthy();
      expect(screen.queryByText('ƯỚC TÍNH CƯỚC CHUYẾN')).toBeNull();

      await screen.unmount();
    });
  });

  describe('in-place booking details modal flow', () => {
    it('opens BookingDetailsModal when CTA is tapped with valid dropoff and invokes onConfirmBooking on confirm', async () => {
      const onConfirmBooking = jest.fn();
      const screen = await render(
        <HomeDashboardScreen
          defaultDropoffLocation="KCN Tân Tạo"
          initialCargoImageUri="file:///test-cargo.jpg"
          onConfirmBooking={onConfirmBooking}
          userName="Nguyễn Văn A"
          userPhone="0912345678"
        />,
      );

      // Modal is not visible initially
      expect(screen.queryByTestId('booking-details-modal')).toBeNull();

      // Tap CTA
      await fireEvent.press(screen.getByText(/TIẾP TỤC ĐẶT XE/));

      // BookingDetailsModal is now visible
      expect(screen.getByTestId('booking-details-modal')).toBeTruthy();
      expect(screen.getByText('Chi tiết chuyến hàng')).toBeTruthy();
      expect(screen.getByDisplayValue('Nguyễn Văn A')).toBeTruthy();
      expect(screen.getByDisplayValue('0912345678')).toBeTruthy();

      // Confirm modal
      await fireEvent.press(screen.getByText(/XÁC NHẬN GỌI XE/));

      expect(onConfirmBooking).toHaveBeenCalledTimes(1);
      expect(onConfirmBooking).toHaveBeenCalledWith(
        expect.objectContaining({
          pickup: 'Kho Tân Bình, TP. Hồ Chí Minh',
          dropoff: 'KCN Tân Tạo',
          receiverName: 'Nguyễn Văn A',
          receiverPhone: '0912345678',
          vehicleCategory: 'LIGHT_TRUCK',
          vehicleName: 'Xe Tải 1.25T',
          totalFare: 280000,
        }),
      );

      await screen.unmount();
    });

    it('closes modal when close button is pressed', async () => {
      const screen = await render(
        <HomeDashboardScreen defaultDropoffLocation="KCN Tân Tạo" />,
      );

      await fireEvent.press(screen.getByText(/TIẾP TỤC ĐẶT XE/));
      expect(screen.getByTestId('booking-details-modal')).toBeTruthy();

      await fireEvent.press(screen.getByLabelText('Đóng modal chi tiết'));
      expect(screen.queryByTestId('booking-details-modal')).toBeNull();

      await screen.unmount();
    });
  });

  it('renders chips, badges, and ETA with logistics green and navy tones instead of cyan', async () => {
    addressStore.saveAddress({
      id: 'addr-hub-1',
      label: 'Kho Thủ Đức',
      address: 'Đường Song Hành, Thủ Đức',
      isDefault: true,
      category: 'WAREHOUSE',
    });

    const screen = await render(
      <HomeDashboardScreen activeShipment={activeShipment} />,
    );

    // Pickup badge text and container
    const badgeContainer = screen.getByTestId('pickup-label-badge');
    expect(StyleSheet.flatten(badgeContainer.props.style).backgroundColor).toBe('#F0FDF4');
    const badgeText = screen.getByTestId('pickup-label-badge-text');
    expect(StyleSheet.flatten(badgeText.props.style).color).toBe('#166534');

    // Hub chip style and text color
    const hubChip = screen.getByTestId('hub-chip-Kho Thủ Đức');
    const hubChipStyle = StyleSheet.flatten(hubChip.props.style);
    expect(hubChipStyle.backgroundColor).toBe('#F8FAFC');
    expect(hubChipStyle.borderColor).toBe('#E2E8F0');

    // Active shipment ETA pill
    const etaPill = screen.getByTestId('active-shipment-eta-pill');
    expect(StyleSheet.flatten(etaPill.props.style).backgroundColor).toBe('#F0F4F9');
    const etaText = screen.getByText(/ETA dự kiến 18 phút/);
    expect(StyleSheet.flatten(etaText.props.style).color).toBe('#0B1E42');

    await screen.unmount();
  });
});
