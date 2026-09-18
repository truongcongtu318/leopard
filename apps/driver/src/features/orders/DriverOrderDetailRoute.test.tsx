import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { act, fireEvent, render, waitFor, within } from '@testing-library/react-native';
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

// The POD flow now uses the real device camera. Stub it so a capture yields a
// concrete on-device URI that the preview can actually render.
const mockLaunchCameraAsync = jest.fn<() => Promise<unknown>>();
const mockRequestCameraPermissionsAsync = jest.fn<() => Promise<{ granted: boolean }>>();

jest.mock('expo-image-picker', () => ({
  requestCameraPermissionsAsync: () => mockRequestCameraPermissionsAsync(),
  requestMediaLibraryPermissionsAsync: async () => ({ granted: true }),
  launchCameraAsync: () => mockLaunchCameraAsync(),
  launchImageLibraryAsync: async () => ({ canceled: true }),
  CameraType: { back: 'back' },
  MediaTypeOptions: { Images: 'Images' },
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
    mockRequestCameraPermissionsAsync.mockResolvedValue({ granted: true });
    mockLaunchCameraAsync.mockResolvedValue({
      canceled: false,
      assets: [
        {
          uri: 'file:///var/mobile/cargo-proof.jpg',
          fileName: 'cargo-proof.jpg',
          mimeType: 'image/jpeg',
          fileSize: 180_000,
        },
      ],
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

  it('captures real delivery proof through the swipe action, with no picker detour', async () => {
    const onExecuteTask = jest.fn();
    const onSelectProof = jest.fn(async () => ({
      ok: true,
      nextCommandId: 'cmd-deliver-22222222-2222-4222-8222-222222222001',
    }));
    const screen = await render(
      <DriverOrderDetailScreen
        onExecuteTask={onExecuteTask}
        onSelectProof={onSelectProof}
        view={createDriverDetailFixture('D-DETAIL-PROOF-REQUIRED')}
      />,
    );

    // 4-step state machine transition labels inside extras drawer
    await fireEvent.press(screen.getByTestId('btn-toggle-mission-extras'));
    expect(screen.getByText('Nhận đơn (ACCEPTED)')).toBeTruthy();
    expect(screen.getByText('Lấy hàng (PICKING_UP)')).toBeTruthy();
    expect(screen.getByText('Vận chuyển (IN_TRANSIT)')).toBeTruthy();
    expect(screen.getByText('Giao hàng (DELIVERED)')).toBeTruthy();

    // Swiping opens the camera itself: no picker prompt, no intermediate modal,
    // and no placeholder signature panel.
    await fireEvent(screen.getByTestId('btn-advance-leg-slide'), 'accessibilityAction', {
      nativeEvent: { actionName: 'activate' },
    });
    expect(screen.queryByTestId('modal-delivery-verification')).toBeNull();
    expect(screen.queryByTestId('epod-signature-pad')).toBeNull();

    // The review sheet previews the real asset the camera returned.
    await screen.findByTestId('proof-capture-sheet');
    expect(screen.getByTestId('proof-capture-photo').props.source).toEqual({
      uri: 'file:///var/mobile/cargo-proof.jpg',
    });
    // The watermark carries the device position, not a fixed demo coordinate.
    expect(screen.getByText(/10\.76260° N, 106\.66020° E/)).toBeTruthy();
    expect(screen.queryByText(/GPS lock/)).toBeNull();

    await screen.unmount();
  });

  it('says the position is unavailable instead of inventing coordinates when GPS is blocked', async () => {
    mockRequestForegroundPermissionsAsync.mockResolvedValue({ status: 'denied' });

    const screen = await render(
      <DriverOrderDetailScreen view={createDriverDetailFixture('D-DETAIL-PROOF-REQUIRED')} />,
    );

    await fireEvent(screen.getByTestId('btn-advance-leg-slide'), 'accessibilityAction', {
      nativeEvent: { actionName: 'activate' },
    });

    expect(await screen.findByText('Chưa có vị trí GPS')).toBeTruthy();
    expect(screen.queryByText(/GPS lock/)).toBeNull();
    expect(screen.queryByText(/10\.7769/)).toBeNull();
    await screen.unmount();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('holds the upload until the driver confirms the captured photo', async () => {
    const onExecuteTask = jest.fn();
    const onSelectProof = jest.fn(async () => ({
      ok: true,
      nextCommandId: 'cmd-deliver-22222222-2222-4222-8222-222222222001',
    }));
    const screen = await render(
      <DriverOrderDetailScreen
        onExecuteTask={onExecuteTask}
        onSelectProof={onSelectProof}
        view={createDriverDetailFixture('D-DETAIL-PROOF-REQUIRED')}
      />,
    );

    await fireEvent(screen.getByTestId('btn-advance-leg-slide'), 'accessibilityAction', {
      nativeEvent: { actionName: 'activate' },
    });
    await screen.findByTestId('proof-capture-sheet');

    // Capturing alone does not upload: the driver reviews first.
    expect(onSelectProof).not.toHaveBeenCalled();
    expect(onExecuteTask).not.toHaveBeenCalled();

    await fireEvent.press(screen.getByTestId('btn-confirm-proof'));

    await waitFor(() => expect(onSelectProof).toHaveBeenCalledTimes(1));
    await waitFor(() =>
      expect(onExecuteTask).toHaveBeenCalledWith(
        'cmd-deliver-22222222-2222-4222-8222-222222222001',
      ),
    );
    // The sheet closes once the flow completes.
    await waitFor(() => expect(screen.queryByTestId('proof-capture-sheet')).toBeNull());

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
    expect(screen.getByText('Bắt đầu đi lấy hàng')).toBeTruthy();

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
    expect(screen.getByText('Bắt đầu đi lấy hàng')).toBeTruthy();
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

    expect(screen.getByText('Đã lấy hàng — bắt đầu giao')).toBeTruthy();

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
