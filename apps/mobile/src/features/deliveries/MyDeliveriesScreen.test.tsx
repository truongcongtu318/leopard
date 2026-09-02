import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render } from '@testing-library/react-native';

import { type DeliveryOrder, MyDeliveriesScreen } from './MyDeliveriesScreen';

const mockOrders: DeliveryOrder[] = [
  {
    id: 'ord-1',
    bookingCode: '#LP-00201',
    cargoType: 'CEMENT_STEEL',
    cargoLabel: '3 tấn Xi Măng Hà Tiên',
    origin: 'Kho VLXD Tân Bình',
    destination: 'KCN Tân Tạo, Bình Tân',
    scheduledDate: '31/08/2026 • 08:30',
    status: 'IN_TRANSIT',
    vehicleName: 'Xe Tải 5T',
    weightKg: 3000,
    priceVnd: '850.000 ₫',
  },
  {
    id: 'ord-2',
    bookingCode: '#LP-00198',
    cargoType: 'FURNITURE',
    cargoLabel: 'Bàn ghế văn phòng (15 bộ)',
    origin: 'Quận 1, TP.HCM',
    destination: 'Quận 7, TP.HCM',
    scheduledDate: '30/08/2026 • 14:00',
    status: 'DELIVERED',
    vehicleName: 'Xe Van 1.5T',
    weightKg: 800,
    priceVnd: '320.000 ₫',
  },
  {
    id: 'ord-3',
    bookingCode: '#LP-00205',
    cargoType: 'BA_GAC_MISC',
    cargoLabel: 'Gạch ốp lát (50 thùng)',
    origin: 'Chợ Bình Tây',
    destination: 'Quận Gò Vấp',
    scheduledDate: '01/09/2026 • 07:00',
    status: 'LOADING',
    vehicleName: 'Xe Ba Gác',
    weightKg: 450,
    priceVnd: '180.000 ₫',
  },
];

describe('MyDeliveriesScreen', () => {
  it('renders page title, search bar, filter chips, and order cards', async () => {
    const onOrderPress = jest.fn();
    const onCreateOrder = jest.fn();

    const screen = await render(
      <MyDeliveriesScreen
        onCreateOrder={onCreateOrder}
        onOrderPress={onOrderPress}
        orders={mockOrders}
      />,
    );

    // Header
    expect(screen.getByText('Đơn hàng của tôi')).toBeTruthy();

    // Filter chips
    expect(screen.getByText('Tất cả')).toBeTruthy();
    expect(screen.getByText('Đang chạy')).toBeTruthy();
    expect(screen.getByText('Đang bốc')).toBeTruthy();
    expect(screen.getAllByText('Hoàn thành').length).toBeGreaterThanOrEqual(1);

    // Order data renders
    expect(screen.getByText('3 tấn Xi Măng Hà Tiên')).toBeTruthy();
    expect(screen.getByText('#LP-00201')).toBeTruthy();
    expect(screen.getByText('Đang vận chuyển')).toBeTruthy();

    // Create order button
    const createBtn = screen.getByLabelText('Tạo đơn hàng mới');
    await fireEvent.press(createBtn);
    expect(onCreateOrder).toHaveBeenCalledTimes(1);

    // Click an order card
    const orderCard = screen.getByLabelText(/Đơn #LP-00201/);
    await fireEvent.press(orderCard);
    expect(onOrderPress).toHaveBeenCalledWith('ord-1');

    await screen.unmount();
  });

  it('filters orders when a chip is pressed', async () => {
    const screen = await render(
      <MyDeliveriesScreen orders={mockOrders} />,
    );

    // Press "Hoàn thành" filter
    const deliveredChip = screen.getByLabelText(/Lọc: Hoàn thành/);
    await fireEvent.press(deliveredChip);

    // Only the delivered order should be visible
    expect(screen.getByText('#LP-00198')).toBeTruthy();
    expect(screen.queryByText('#LP-00201')).toBeNull();
    expect(screen.queryByText('#LP-00205')).toBeNull();

    await screen.unmount();
  });

  it('shows empty state when no orders match filter', async () => {
    const screen = await render(
      <MyDeliveriesScreen orders={[]} />,
    );

    expect(screen.getByText('Không có đơn hàng nào')).toBeTruthy();

    await screen.unmount();
  });

  it('filters orders by search query', async () => {
    const screen = await render(
      <MyDeliveriesScreen orders={mockOrders} />,
    );

    const searchInput = screen.getByLabelText('Tìm kiếm đơn hàng');
    await fireEvent.changeText(searchInput, 'Xi Măng');

    expect(screen.getByText('#LP-00201')).toBeTruthy();
    expect(screen.queryByText('#LP-00198')).toBeNull();

    await screen.unmount();
  });
});
