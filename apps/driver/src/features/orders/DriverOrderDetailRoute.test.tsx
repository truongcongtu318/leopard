import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { act, fireEvent, render } from '@testing-library/react-native';
import { Animated, PanResponder } from 'react-native';

const mockDriverOrderDetailRuntime = jest.fn<(props: unknown) => null>(() => null);
let mockSearchParams: Readonly<Record<string, string | readonly string[] | undefined>> = {};

// The e-POD watermark stamps the driver's real position, so the device location
// has to be stubbed for the capture flow to produce coordinates.
const mockRequestForegroundPermissionsAsync = jest.fn<() => Promise<{ status: string }>>();
const mockGetCurrentPositionAsync = jest.fn<
  () => Promise<{ coords: { latitude: number; longitude: number } }>
>();

jest.mock('expo-location', () => ({
  Accuracy: { High: 6, Balanced: 3 },
  requestForegroundPermissionsAsync: () => mockRequestForegroundPermissionsAsync(),
  getCurrentPositionAsync: () => mockGetCurrentPositionAsync(),
}));

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
    mockRequestForegroundPermissionsAsync.mockResolvedValue({ status: 'granted' });
    mockGetCurrentPositionAsync.mockResolvedValue({
      coords: { latitude: 10.7626, longitude: 106.6602 },
    });
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
        view={createDriverDetailFixture('D-DETAIL-PROOF-REQUIRED')}
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
    // The watermark carries the device position, not a fixed demo coordinate.
    expect(await screen.findByText(/10\.76260° N, 106\.66020° E/)).toBeTruthy();
    expect(screen.queryByText(/GPS lock/)).toBeNull();
    expect(screen.getByText(/LEOPARD e-POD/)).toBeTruthy();

    // Part 2: Warehouse receiver digital signature pad
    const signPad = screen.getByTestId('epod-signature-pad');
    await fireEvent.press(signPad);
    expect(screen.getByText('Nguyễn Văn A')).toBeTruthy();
    expect(screen.getByText(/Chữ ký điện tử đã được xác thực/)).toBeTruthy();

    // Now both photo & signature are captured -> status pill ready
    expect(screen.getByText('ĐỦ ĐIỀU KIỆN')).toBeTruthy();

    // Final confirmation can be completed via SlideToAction accessibility action
    await fireEvent(screen.getByTestId('btn-epod-complete-delivery'), 'accessibilityAction', {
      nativeEvent: { actionName: 'activate' },
    });
    expect(onExecuteTask).toHaveBeenCalledWith('cmd-deliver-22222222-2222-4222-8222-222222222001');

    await screen.unmount();
  });

  it('says the position is unavailable instead of inventing coordinates when GPS is blocked', async () => {
    mockRequestForegroundPermissionsAsync.mockResolvedValue({ status: 'denied' });

    const screen = await render(
      <DriverOrderDetailScreen view={createDriverDetailFixture('D-DETAIL-PROOF-REQUIRED')} />,
    );

    await fireEvent.press(screen.getByTestId('btn-capture-cargo-photo'));

    expect(await screen.findByText('Chưa có vị trí GPS')).toBeTruthy();
    expect(screen.queryByText(/GPS lock/)).toBeNull();
    expect(screen.queryByText(/10\.7769/)).toBeNull();

    await screen.unmount();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('completes delivery transition via SlideToAction swipe once e-POD requirements are satisfied', async () => {
    const panSpy = jest.spyOn(PanResponder, 'create');
    jest.spyOn(Animated, 'spring').mockImplementation((_, config: any) => ({
      start: (cb?: (result: { finished: boolean }) => void) => {
        cb?.({ finished: true });
        return undefined as any;
      },
      stop: jest.fn(),
      reset: jest.fn(),
    }));

    const onExecuteTask = jest.fn();
    const screen = await render(
      <DriverOrderDetailScreen
        onExecuteTask={onExecuteTask}
        view={createDriverDetailFixture('D-DETAIL-PROOF-REQUIRED')}
      />,
    );

    // Initial state: incomplete e-POD -> SlideToAction disabled
    const slider = screen.getByTestId('btn-epod-complete-delivery');
    expect(slider.props.accessibilityState).toEqual({ disabled: true });
    expect(screen.getByText('CHƯA ĐỦ ĐIỀU KIỆN')).toBeTruthy();

    // 1. Capture cargo photo with GPS watermark
    await fireEvent.press(screen.getByTestId('btn-capture-cargo-photo'));
    expect(screen.getByTestId('camera-watermark-overlay')).toBeTruthy();
    expect(screen.getByText('CHƯA ĐỦ ĐIỀU KIỆN')).toBeTruthy();
    expect(screen.getByTestId('btn-epod-complete-delivery').props.accessibilityState).toEqual({
      disabled: true,
    });

    // 2. Sign in digital signature pad
    await fireEvent.press(screen.getByTestId('epod-signature-pad'));
    expect(screen.getByText('ĐỦ ĐIỀU KIỆN')).toBeTruthy();
    expect(screen.getByTestId('btn-epod-complete-delivery').props.accessibilityState).toEqual({
      disabled: false,
    });

    // 3. Clear signature to verify dynamic disabling
    await fireEvent.press(screen.getByRole('button', { name: 'Ký lại chữ ký' }));
    expect(screen.getByText('CHƯA ĐỦ ĐIỀU KIỆN')).toBeTruthy();
    expect(screen.getByTestId('btn-epod-complete-delivery').props.accessibilityState).toEqual({
      disabled: true,
    });

    // Re-sign to make it ready again
    await fireEvent.press(screen.getByTestId('epod-signature-pad'));
    expect(screen.getByText('ĐỦ ĐIỀU KIỆN')).toBeTruthy();
    expect(screen.getByTestId('btn-epod-complete-delivery').props.accessibilityState).toEqual({
      disabled: false,
    });

    // 4. Perform SlideToAction swipe gesture past threshold (>= 75%)
    const panConfig = panSpy.mock.calls[panSpy.mock.calls.length - 1][0];
    const mockEvent = {} as any;
    await act(async () => {
      panConfig.onPanResponderGrant?.(mockEvent, { dx: 0, dy: 0 } as any);
      panConfig.onPanResponderMove?.(mockEvent, { dx: 240, dy: 0 } as any);
      panConfig.onPanResponderRelease?.(mockEvent, { dx: 240, dy: 0 } as any);
    });

    expect(onExecuteTask).toHaveBeenCalledWith('cmd-deliver-22222222-2222-4222-8222-222222222001');
    await screen.unmount();
  });

  it('advances mission leg via SlideToAction in TaskButton', async () => {
    const panSpy = jest.spyOn(PanResponder, 'create');
    jest.spyOn(Animated, 'spring').mockImplementation((_, config: any) => ({
      start: (cb?: (result: { finished: boolean }) => void) => {
        cb?.({ finished: true });
        return undefined as any;
      },
      stop: jest.fn(),
      reset: jest.fn(),
    }));

    const onExecuteTask = jest.fn();
    const screen = await render(
      <DriverOrderDetailScreen
        onExecuteTask={onExecuteTask}
        view={createDriverDetailFixture('D-DETAIL-ACCEPTED')}
      />,
    );

    expect(screen.getByTestId('btn-advance-leg-slide')).toBeTruthy();
    expect(screen.getByText('Vuốt: Bắt đầu đi lấy hàng ➔')).toBeTruthy();

    const panConfig = panSpy.mock.calls[panSpy.mock.calls.length - 1][0];
    const mockEvent = {} as any;
    await act(async () => {
      panConfig.onPanResponderGrant?.(mockEvent, { dx: 0, dy: 0 } as any);
      panConfig.onPanResponderMove?.(mockEvent, { dx: 240, dy: 0 } as any);
      panConfig.onPanResponderRelease?.(mockEvent, { dx: 240, dy: 0 } as any);
    });

    expect(onExecuteTask).toHaveBeenCalledWith('cmd-pickup-demo');
    await screen.unmount();
  });

  it('resets SlideToAction on command change and accepts sequential swipes without freezing', async () => {
    const panSpy = jest.spyOn(PanResponder, 'create');
    jest.spyOn(Animated, 'spring').mockImplementation((_, config: any) => ({
      start: (cb?: (result: { finished: boolean }) => void) => {
        cb?.({ finished: true });
        return undefined as any;
      },
      stop: jest.fn(),
      reset: jest.fn(),
    }));

    const onExecuteTask = jest.fn();
    const screen = await render(
      <DriverOrderDetailScreen
        onExecuteTask={onExecuteTask}
        view={createDriverDetailFixture('D-DETAIL-ACCEPTED')}
      />,
    );

    // Initial leg: cmd-pickup-demo
    expect(screen.getByText('Vuốt: Bắt đầu đi lấy hàng ➔')).toBeTruthy();
    let panConfig = panSpy.mock.calls[panSpy.mock.calls.length - 1][0];
    const mockEvent = {} as any;
    await act(async () => {
      panConfig.onPanResponderGrant?.(mockEvent, { dx: 0, dy: 0 } as any);
      panConfig.onPanResponderMove?.(mockEvent, { dx: 240, dy: 0 } as any);
      panConfig.onPanResponderRelease?.(mockEvent, { dx: 240, dy: 0 } as any);
    });

    expect(onExecuteTask).toHaveBeenCalledWith('cmd-pickup-demo');
    // Completed state locks PanResponder on previous command
    expect(panConfig.onStartShouldSetPanResponder?.(mockEvent, { dx: 0, dy: 0 } as any)).toBe(false);

    // Sequential transition: re-render with next command (cmd-transit-demo)
    await screen.rerender(
      <DriverOrderDetailScreen
        onExecuteTask={onExecuteTask}
        view={createDriverDetailFixture('D-DETAIL-PICKING-UP')}
      />,
    );

    expect(screen.getByText('Vuốt: Đã lấy hàng — bắt đầu giao ➔')).toBeTruthy();

    // Verify SlideToAction is re-armed with fresh resetKey/key and accepts the next swipe
    panConfig = panSpy.mock.calls[panSpy.mock.calls.length - 1][0];
    expect(panConfig.onStartShouldSetPanResponder?.(mockEvent, { dx: 0, dy: 0 } as any)).toBe(true);
    await act(async () => {
      panConfig.onPanResponderGrant?.(mockEvent, { dx: 0, dy: 0 } as any);
      panConfig.onPanResponderMove?.(mockEvent, { dx: 240, dy: 0 } as any);
      panConfig.onPanResponderRelease?.(mockEvent, { dx: 240, dy: 0 } as any);
    });

    expect(onExecuteTask).toHaveBeenCalledWith('cmd-transit-demo');
    await screen.unmount();
  });
});
