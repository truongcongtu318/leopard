import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { render, waitFor } from '@testing-library/react-native';

const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockBack = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
    back: mockBack,
  }),
}));

const mockGetOrderDetailView = jest.fn<any>();
const mockGetOrdersView = jest.fn<any>();

jest.mock('../customer/orders/adapter', () => {
  const actual = jest.requireActual('../customer/orders/adapter') as object;
  return {
    ...actual,
    createCustomerHttpAdapter: () => ({
      getOrderDetailView: mockGetOrderDetailView,
      getOrdersView: mockGetOrdersView,
    }),
  };
});

jest.mock('@leopard/mobile-core', () => {
  const actual = jest.requireActual('@leopard/mobile-core') as object;
  return {
    ...actual,
    createSocketFactory: jest.fn(() => ({
      connected: true,
      connect: jest.fn(),
      disconnect: jest.fn(),
      emit: jest.fn(),
      on: jest.fn(),
      off: jest.fn(),
      removeAllListeners: jest.fn(),
    })),
  };
});

import { CustomerTrackingRuntime } from './CustomerTrackingRuntime';

describe('CustomerTrackingRuntime', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('correctly passes isSimulatedData=true and renders "Dữ liệu mô phỏng" badge when order has DEMO etaSource', async () => {
    const mockOrder = {
      id: 'demo-order-123',
      reference: 'LP-DEMO-01',
      status: 'IN_TRANSIT',
      route: {
        origin: { label: 'Kho Tân Bình', coords: { lat: 10.795, lng: 106.652 } },
        destination: { label: 'KCN Tân Tạo', coords: { lat: 10.758, lng: 106.574 } },
        stops: [],
      },
      cargo: { note: '2 tấn thép', weightKg: 2000 },
      priceLabel: '500.000 ₫',
      distanceMeters: 15000,
      etaDurationSeconds: 1200,
      etaSource: 'DEMO',
      updatedAtLabel: '10:00',
      tracking: { kind: 'fresh', driverLabel: 'Tài xế demo' },
      payment: { status: 'PAID', qrState: 'none' },
      invoice: null,
      media: { kind: 'empty' },
      history: [],
      assignedDriver: {
        name: 'Trần Văn Mạnh',
        phone: '0901234567',
        licensePlate: '59C-123.45',
        vehicleType: 'Xe Tải 1.25T',
      },
    };

    mockGetOrderDetailView.mockResolvedValueOnce({
      kind: 'content',
      order: mockOrder,
    });

    const screen = await render(<CustomerTrackingRuntime initialOrderId="demo-order-123" />);

    await waitFor(() => {
      expect(screen.getByTestId('badge-demo-data')).toBeTruthy();
      expect(screen.getByText('Dữ liệu mô phỏng')).toBeTruthy();
      expect(screen.getAllByText(/ETA dự kiến/).length).toBeGreaterThanOrEqual(1);
    });

    await screen.unmount();
  });
});
