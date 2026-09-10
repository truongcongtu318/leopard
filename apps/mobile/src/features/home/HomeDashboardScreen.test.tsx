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

    // Promo banner click jumps into order creation
    await fireEvent.press(screen.getByLabelText(/Đặt xe phù hợp với hàng/));
    expect(onCreateOrder).toHaveBeenCalledTimes(1);

    // Active shipment sits at the top: status + route + ETA, opens on press
    expect(screen.getByText('Đang vận chuyển')).toBeTruthy();
    expect(screen.getByText('Kho Tân Bình')).toBeTruthy();
    expect(screen.getByText(/18 phút/)).toBeTruthy();
    expect(screen.getByText(/59C-882\.14/)).toBeTruthy();
    await fireEvent.press(screen.getByLabelText(/Chuyến đang vận chuyển/));
    expect(onOpenActiveOrder).toHaveBeenCalledWith('ord-active-1');

    // Recent orders as ledger rows
    expect(screen.getByText('Đơn LP-240902')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('order-summary-LP-240902'));
    expect(onOpenOrder).toHaveBeenCalledWith('ord-2');
    await fireEvent.press(screen.getByLabelText('Xem tất cả đơn hàng'));
    expect(onViewAllOrders).toHaveBeenCalledTimes(1);

    // Quick book by vehicle jumps into the create flow
    await fireEvent.press(screen.getByLabelText('Đặt nhanh Xe Tải Nhẹ'));
    expect(onSelectVehicleAndBook).toHaveBeenCalledWith('LIGHT_TRUCK');

    // Wallet utility strip removed from home dashboard
    expect(screen.queryByText('Ví VietQR')).toBeNull();
    expect(screen.queryByLabelText('Nạp tiền vào ví')).toBeNull();

    // FloatingNavBar hidden by default
    expect(screen.queryByLabelText('Trang chủ')).toBeNull();

    await screen.unmount();
  }, 60000);

  it('renders calm empty states when there is no work yet', async () => {
    const screen = await render(
      <HomeDashboardScreen activeShipment={null} recentOrders={[]} />,
    );

    expect(screen.getByText('Chưa có chuyến nào đang chạy')).toBeTruthy();
    expect(screen.getByText('Bạn chưa có đơn hàng nào.')).toBeTruthy();

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

  it('triggers onRegisterDriver when driver registration button is pressed', async () => {
    const onRegisterDriver = jest.fn();
    const screen = await render(
      <HomeDashboardScreen onRegisterDriver={onRegisterDriver} />,
    );

    const driverBtn = screen.getByTestId('home-driver-btn');
    expect(driverBtn).toBeTruthy();
    expect(screen.getByText('Đăng ký tài xế')).toBeTruthy();
    await fireEvent.press(driverBtn);
    expect(onRegisterDriver).toHaveBeenCalledTimes(1);

    await screen.unmount();
  });

  it('submits quick route booking with custom pickup and dropoff', async () => {
    const onQuickBook = jest.fn();
    const screen = await render(
      <HomeDashboardScreen onQuickBook={onQuickBook} />,
    );

    // Default pickup location is prefilled
    expect(screen.getByDisplayValue('Kho Tân Bình, TP. Hồ Chí Minh')).toBeTruthy();

    // Type a destination and submit via fast forward button
    await fireEvent.changeText(
       screen.getByPlaceholderText('Bạn muốn giao hàng đến đâu?...'),
       'KCN Sóng Thần, Bình Dương',
    );
    await fireEvent.press(screen.getByTestId('quick-book-submit-btn'));
    await new Promise((r) => setTimeout(r, 450));

    expect(onQuickBook).toHaveBeenCalledWith(
      'Kho Tân Bình, TP. Hồ Chí Minh',
      'KCN Sóng Thần, Bình Dương',
    );

    await screen.unmount();
  });

  it('shows all three informational slides and preserves their booking actions', async () => {
    const onCreateOrder = jest.fn();
    const screen = await render(<HomeDashboardScreen onCreateOrder={onCreateOrder} />);

    expect(screen.getByText('Đặt xe phù hợp với hàng')).toBeTruthy();
    await fireEvent.press(screen.getByLabelText(/Đặt xe phù hợp với hàng/));
    await fireEvent.press(screen.getByLabelText('Chuyển đến ưu đãi 2'));
    expect(screen.getByText('Lên đơn từ địa chỉ đã lưu')).toBeTruthy();
    await fireEvent.press(screen.getByLabelText(/Lên đơn từ địa chỉ đã lưu/));
    await fireEvent.press(screen.getByLabelText('Chuyển đến ưu đãi 3'));
    expect(screen.getByText('Theo dõi từng chặng giao')).toBeTruthy();
    await fireEvent.press(screen.getByLabelText(/Theo dõi từng chặng giao/));
    expect(onCreateOrder).toHaveBeenCalledTimes(3);

    await screen.unmount();
  });

  it.each([activeShipment, null])('places shipment status directly after booking before services (%p)', async (shipment) => {
    const screen = await render(<HomeDashboardScreen activeShipment={shipment} />);
    const sectionIds = ['home-booking', 'home-active-shipments', 'home-services'];
    sectionIds.forEach((id) => expect(screen.getByTestId(id)).toBeTruthy());
    const renderedTree = JSON.stringify(screen.toJSON());
    expect(renderedTree.indexOf('home-booking')).toBeLessThan(renderedTree.indexOf('home-active-shipments'));
    expect(renderedTree.indexOf('home-active-shipments')).toBeLessThan(renderedTree.indexOf('home-services'));
    if (shipment === null) {
      expect(screen.getByLabelText('Tra cứu mã vận đơn')).toBeTruthy();
    } else {
      expect(screen.getByLabelText(/Chuyến đang vận chuyển/)).toBeTruthy();
    }

    await screen.unmount();
  });

  it('keeps every redesigned service card connected to its booking flow', async () => {
    const onSelectVehicleAndBook = jest.fn();
    const onCreateOrder = jest.fn();
    const screen = await render(
      <HomeDashboardScreen onCreateOrder={onCreateOrder} onSelectVehicleAndBook={onSelectVehicleAndBook} />,
    );

    for (const [label, vehicleId] of [
      ['Xe Ba Gác', '3_WHEEL_BIKE'],
      ['Xe Tải Nhẹ', 'LIGHT_TRUCK'],
      ['Xe Tải Nặng', 'HEAVY_TRUCK'],
    ]) {
      await fireEvent.press(screen.getByLabelText(`Đặt nhanh ${label}`));
      expect(onSelectVehicleAndBook).toHaveBeenLastCalledWith(vehicleId);
    }
    expect(onSelectVehicleAndBook).toHaveBeenCalledTimes(3);
    for (const label of ['Giao Hỏa Tốc', 'Dịch Vụ Bốc Xếp', 'Thu Hộ COD']) {
      await fireEvent.press(screen.getByLabelText(`Đặt nhanh ${label}`));
    }
    expect(onCreateOrder).toHaveBeenCalledTimes(3);

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

  it('supports 1-tap reorder from recent orders to auto-populate and navigate', async () => {
    const onQuickBook = jest.fn();
    const screen = await render(
      <HomeDashboardScreen
        onQuickBook={onQuickBook}
        recentOrders={recentOrders}
      />,
    );

    // Tap "Đặt lại chuyến này →" on first order (Quận 7 -> Thủ Đức)
    const reorderBtn = screen.getByLabelText('Đặt lại chuyến LP-240902');
    expect(reorderBtn).toBeTruthy();
    await fireEvent.press(reorderBtn);
    await new Promise((r) => setTimeout(r, 450));

    expect(onQuickBook).toHaveBeenCalledWith('Quận 7', 'Thủ Đức');

    await screen.unmount();
  });

  it('allows quick tracking by order code', async () => {
    const onOpenOrder = jest.fn();
    const screen = await render(
      <HomeDashboardScreen activeShipment={null} onOpenOrder={onOpenOrder} />,
    );

    const trackInput = screen.getByLabelText('Tra cứu mã vận đơn');
    expect(trackInput).toBeTruthy();
    await fireEvent.changeText(trackInput, 'LP-999999');
    await fireEvent.press(screen.getByLabelText('Tra cứu đơn hàng'));

    expect(onOpenOrder).toHaveBeenCalledWith('LP-999999');

    await screen.unmount();
  });

  it('only displays delivered orders in recent orders section and excludes other statuses', async () => {
    const screen = await render(
      <HomeDashboardScreen
        recentOrders={[
          {
            id: 'ord-deliv',
            reference: 'LP-DELIVERED',
            status: 'DELIVERED',
            origin: 'Điểm lấy A',
            destination: 'Điểm giao A',
          },
          {
            id: 'ord-transit',
            reference: 'LP-TRANSIT',
            status: 'IN_TRANSIT',
            origin: 'Điểm lấy B',
            destination: 'Điểm giao B',
          },
          {
            id: 'ord-req',
            reference: 'LP-REQUESTED',
            status: 'REQUESTED',
            origin: 'Điểm lấy C',
            destination: 'Điểm giao C',
          },
          {
            id: 'ord-canc',
            reference: 'LP-CANCELLED',
            status: 'CANCELLED',
            origin: 'Điểm lấy D',
            destination: 'Điểm giao D',
          },
        ]}
      />,
    );

    expect(screen.getByText('Đơn LP-DELIVERED')).toBeTruthy();
    expect(screen.queryByText('Đơn LP-TRANSIT')).toBeNull();
    expect(screen.queryByText('Đơn LP-REQUESTED')).toBeNull();
    expect(screen.queryByText('Đơn LP-CANCELLED')).toBeNull();

    await screen.unmount();
  });

  it('displays vehicle dimensions (L x W x H) and cargo capacity in fleet matrix', async () => {
    const onSelectVehicleAndBook = jest.fn();
    const screen = await render(
      <HomeDashboardScreen onSelectVehicleAndBook={onSelectVehicleAndBook} />,
    );
    expect(screen.getByText('3.2 x 1.6 x 1.7m')).toBeTruthy(); // Tải 1.25T
    expect(screen.getByText('2.1 x 1.3 x 1.2m')).toBeTruthy(); // Van 500kg
    expect(screen.getByText('4.3 x 1.8 x 1.9m')).toBeTruthy(); // Tải 2.5T
    expect(screen.getByText('1.8 x 1.1m')).toBeTruthy(); // Ba gác
    expect(screen.getByTestId('home-interactive-map')).toBeTruthy();
    expect(screen.getByText('ƯỚC TÍNH CƯỚC CHUYẾN')).toBeTruthy();

    // Tap CTA
    await fireEvent.press(screen.getByLabelText(/Đặt xe ngay/));
    expect(onSelectVehicleAndBook).toHaveBeenCalledWith('LIGHT_TRUCK');

    await screen.unmount();
  });
});
