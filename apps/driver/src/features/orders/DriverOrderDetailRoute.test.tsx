import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render } from '@testing-library/react-native';

const mockDriverOrderDetailRuntime = jest.fn<(props: unknown) => null>(() => null);
let mockSearchParams: Readonly<Record<string, string | readonly string[] | undefined>> = {};

jest.mock('expo-router', () => ({
  useLocalSearchParams: () => mockSearchParams,
}));

jest.mock('./DriverOrderDetailRuntime', () => ({
  DriverOrderDetailRuntime: (props: unknown) => mockDriverOrderDetailRuntime(props),
}));

import DriverOrderDetailPage from '../../../app/orders/[id]';
import { DriverOrderDetailScreen } from './DriverOrderDetailScreen';
import { createDriverDetailFixture } from './fixtures';

describe('Driver order detail route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSearchParams = {};
  });

  it('forwards the exact validated order ID to the runtime container', async () => {
    const orderId = '22222222-2222-4222-8222-222222222099';
    mockSearchParams = { id: orderId };

    const screen = await render(<DriverOrderDetailPage />);

    expect(mockDriverOrderDetailRuntime).toHaveBeenCalledTimes(1);
    expect(mockDriverOrderDetailRuntime.mock.calls[0]?.[0]).toEqual({
      orderId,
    });
    await screen.unmount();
  });

  it('fails closed before the runtime container for a malformed order ID', async () => {
    mockSearchParams = { id: ['not-a-uuid'] };

    const screen = await render(<DriverOrderDetailPage />);

    expect(screen.getByText('Mã đơn không hợp lệ')).toBeTruthy();
    expect(mockDriverOrderDetailRuntime).not.toHaveBeenCalled();
    await screen.unmount();
  });

  it('requires delivery proof photo and signature before completing order', async () => {
    const onExecuteTask = jest.fn();
    const screen = await render(
      <DriverOrderDetailScreen
        onExecuteTask={onExecuteTask}
        orderId="order-1"
      />,
    );

    // Section labeled XÁC THỰC BÀN GIAO (POD)
    expect(screen.getByText('XÁC THỰC BÀN GIAO (POD)')).toBeTruthy();

    // 4-step state machine transition labels
    expect(screen.getByText('Nhận đơn (ACCEPTED)')).toBeTruthy();
    expect(screen.getByText('Lấy hàng (PICKING_UP)')).toBeTruthy();
    expect(screen.getByText('Vận chuyển (IN_TRANSIT)')).toBeTruthy();
    expect(screen.getByText('Giao hàng (DELIVERED)')).toBeTruthy();

    // Verification container and requirements
    expect(screen.getByTestId('epod-verification-container')).toBeTruthy();
    expect(screen.getByText('CHƯA ĐỦ ĐIỀU KIỆN')).toBeTruthy();

    // Part 1: Cargo photo with GPS + timestamp watermark
    const captureBtn = screen.getByTestId('btn-capture-cargo-photo');
    await fireEvent.press(captureBtn);
    expect(screen.getByTestId('camera-watermark-overlay')).toBeTruthy();
    expect(screen.getByText(/GPS lock/)).toBeTruthy();
    expect(screen.getByText(/LEOPARD e-POD/)).toBeTruthy();

    // Part 2: Warehouse receiver digital signature pad
    const signPad = screen.getByTestId('epod-signature-pad');
    await fireEvent.press(signPad);
    expect(screen.getByText('Nguyễn Văn A')).toBeTruthy();
    expect(screen.getByText(/Chữ ký điện tử đã được xác thực/)).toBeTruthy();

    // Now both photo & signature are captured -> status pill ready
    expect(screen.getByText('ĐỦ ĐIỀU KIỆN')).toBeTruthy();

    // Final confirmation can be completed
    const completeBtn = screen.getByRole('button', {
      name: 'Xác nhận hoàn tất giao hàng (DELIVERED)',
    });
    await fireEvent.press(completeBtn);
    expect(onExecuteTask).toHaveBeenCalledWith('cmd-deliver-order-1');

    await screen.unmount();
  });
});
