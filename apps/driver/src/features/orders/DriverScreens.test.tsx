import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, waitFor } from '@testing-library/react-native';

// The swipe action now opens the real device camera and stamps the driver's
// real GPS position, so both native modules are stubbed.
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

jest.mock('expo-location', () => ({
  Accuracy: { High: 6, Balanced: 3 },
  requestForegroundPermissionsAsync: async () => ({ status: 'granted' }),
  getCurrentPositionAsync: async () => ({
    coords: { latitude: 10.7626, longitude: 106.6602 },
  }),
  watchPositionAsync: async () => ({ remove: () => {} }),
}));

import { DriverOrderDetailScreen } from './DriverOrderDetailScreen';
import { DriverOrdersScreen } from './DriverOrdersScreen';
import { createDriverDetailFixture, createDriverListFixture } from './fixtures';

describe('DriverOrdersScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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

  it('puts availability and the active trip before public requested summaries', async () => {
    const onOpenOrder = jest.fn();
    const screen = await render(
      <DriverOrdersScreen
        driverIdentity={{ name: 'Nguyễn Văn Tuấn', vehiclePlate: '51C-889.24', vehicleType: 'Xe tải 2.5T' }}
        onOpenOrder={onOpenOrder}
        view={createDriverListFixture('D-LIST-ACTIVE-REQUESTED')}
      />,
    );

    expect(screen.getByTestId('driver-active-trip-slab')).toBeTruthy();
    expect(screen.getByText('Trạng thái nhận đơn')).toBeTruthy();
    expect(screen.getByText('Chuyến đang thực hiện')).toBeTruthy();
    expect(screen.queryByText('Thông tin liên hệ khách hàng · chỉ hiện sau phân công')).toBeNull();

    await fireEvent.press(screen.getByRole('button', { name: /Mở chuyến LP-D-260815-001/ }));
    expect(onOpenOrder).toHaveBeenCalledWith('22222222-2222-4222-8222-222222222001');
    await screen.unmount();
  }, 15000);

  it('blocks repeated availability updates while pending', async () => {
    const onSetAvailability = jest.fn();
    const screen = await render(
      <DriverOrdersScreen
        onSetAvailability={onSetAvailability}
        view={createDriverListFixture('D-LIST-AVAILABILITY-PENDING')}
      />,
    );
    const toggle = screen.getByRole('button', { name: 'Đang cập nhật trạng thái nhận đơn' });
    await fireEvent.press(toggle);
    await fireEvent.press(toggle);
    expect(toggle.props.accessibilityState).toMatchObject({ busy: true, disabled: true });
    expect(onSetAvailability).not.toHaveBeenCalled();
    await screen.unmount();
  });

  it('does not mount active or requested orders at a permission boundary', async () => {
    const screen = await render(
      <DriverOrdersScreen view={createDriverListFixture('D-LIST-PERMISSION')} />,
    );
    expect(screen.getByText('Bạn không có quyền xem khu vực tài xế')).toBeTruthy();
    expect(screen.queryByText('Khu vực Tân Phú → TP. Thủ Đức')).toBeNull();
    await screen.unmount();
  });

  it('triggers and displays incoming dispatch modal when simulating offer', async () => {
    const onOpenOrder = jest.fn();
    const screen = await render(
      <DriverOrdersScreen
        onOpenOrder={onOpenOrder}
        showDebugActions
        view={createDriverListFixture('D-LIST-REQUESTED')}
      />,
    );

    // Initial state: modal should not be visible
    expect(screen.queryByText('Đơn mới trong khu vực')).toBeNull();

    // Trigger simulation
    const simButton = screen.getByRole('button', { name: 'Mô phỏng nổ đơn' });
    await fireEvent.press(simButton);

    // Modal appears with prominent fare, route, and actions
    expect(screen.getByText('Đơn mới trong khu vực')).toBeTruthy();
    expect(screen.getByText('Thu nhập ròng')).toBeTruthy();
    expect(screen.getByTestId('dispatch-slide-action')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Bỏ qua' })).toBeTruthy();

    // Accept action forwards to onOpenOrder
    await fireEvent(screen.getByTestId('dispatch-slide-action'), 'accessibilityAction', {
      nativeEvent: { actionName: 'activate' },
    });
    expect(onOpenOrder).toHaveBeenCalledWith('22222222-2222-4222-8222-222222222101');

    // Modal closes after acceptance
    expect(screen.queryByText('Đơn mới trong khu vực')).toBeNull();

    await screen.unmount();
  });
});

describe('DriverOrderDetailScreen', () => {
  it('renders public summary and one accept action without assigned private fields', async () => {
    const onExecuteTask = jest.fn();
    const screen = await render(
      <DriverOrderDetailScreen
        onExecuteTask={onExecuteTask}
        view={createDriverDetailFixture('D-DETAIL-PUBLIC-REQUESTED')}
      />,
    );

    expect(screen.getByText('Khu vực Tân Phú → TP. Thủ Đức')).toBeTruthy();
    expect(screen.queryByText('Kho riêng tư mô phỏng tại Quận 7')).toBeNull();
    expect(screen.queryByText('Thông tin liên hệ khách hàng · chỉ hiện sau phân công')).toBeNull();
    const accept = screen.getByRole('button', { name: 'Nhận đơn' });
    await fireEvent.press(accept);
    expect(onExecuteTask).toHaveBeenCalledWith('cmd-accept-demo');
    expect(screen.getAllByRole('button')).toHaveLength(1);
    await screen.unmount();
  });

  it('blocks duplicate accept while pending', async () => {
    const onExecuteTask = jest.fn();
    const screen = await render(
      <DriverOrderDetailScreen
        onExecuteTask={onExecuteTask}
        view={createDriverDetailFixture('D-DETAIL-ACCEPT-PENDING')}
      />,
    );
    const accept = screen.getByRole('button', { name: 'Đang nhận đơn' });
    await fireEvent.press(accept);
    await fireEvent.press(accept);
    expect(onExecuteTask).not.toHaveBeenCalled();
    expect(accept.props.accessibilityState).toMatchObject({ busy: true, disabled: true });
    await screen.unmount();
  });

  it('renders a 409 race as a safe conflict and never flashes assigned detail', async () => {
    const onResolveConflict = jest.fn();
    const screen = await render(
      <DriverOrderDetailScreen
        onResolveConflict={onResolveConflict}
        view={createDriverDetailFixture('D-DETAIL-ACCEPT-RACE')}
      />,
    );

    expect(screen.getByText('Tài xế khác vừa nhận đơn này.')).toBeTruthy();
    expect(screen.queryByText('Kho riêng tư mô phỏng tại Quận 7')).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: 'Xem đơn còn trống' }));
    expect(onResolveConflict).toHaveBeenCalledTimes(1);
    await screen.unmount();
  });

  it('swipes into the camera and only advances after the proof upload succeeds', async () => {
    const onExecuteTask = jest.fn();
    // Mirrors the runtime contract: a successful upload reports the command the
    // server now expects, which is the delivery command, not the proof task.
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

    // Missing proof -> the swipe action asks for the capture, and DELIVERED is
    // not offered yet.
    expect(screen.getByText('Vuốt và chụp ảnh xác nhận')).toBeTruthy();
    expect(screen.queryByText('Xác nhận đã giao')).toBeNull();

    // Swiping opens the proof source selector modal (camera vs library)
    await fireEvent(screen.getByTestId('btn-advance-leg-slide'), 'accessibilityAction', {
      nativeEvent: { actionName: 'activate' },
    });
    await fireEvent.press(screen.getByTestId('btn-source-camera'));

    // The review sheet shows the real captured photo.
    const sheet = await screen.findByTestId('proof-capture-sheet');
    expect(sheet).toBeTruthy();
    expect(screen.getByTestId('proof-capture-photo').props.source).toEqual({
      uri: 'file:///var/mobile/cargo-proof.jpg',
    });

    // Confirming uploads, then advances exactly once.
    expect(onSelectProof).not.toHaveBeenCalled();
    await fireEvent.press(screen.getByTestId('btn-confirm-proof'));

    await waitFor(() => expect(onSelectProof).toHaveBeenCalledTimes(1));
    await waitFor(() =>
      expect(onExecuteTask).toHaveBeenCalledWith(
        'cmd-deliver-22222222-2222-4222-8222-222222222001',
      ),
    );
    await screen.unmount();
  });

  it('does not advance the order when the proof upload reports failure', async () => {
    // The delivery must not be recorded as complete when its evidence did not
    // reach the server.
    const onExecuteTask = jest.fn();
    const onSelectProof = jest.fn(async () => false);
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
    await fireEvent.press(screen.getByTestId('btn-source-camera'));
    await screen.findByTestId('proof-capture-sheet');
    await fireEvent.press(screen.getByTestId('btn-confirm-proof'));

    await waitFor(() => expect(onSelectProof).toHaveBeenCalledTimes(1));
    expect(onExecuteTask).not.toHaveBeenCalled();
    // The photo is kept so the driver can retry instead of losing evidence.
    expect(screen.getByTestId('proof-capture-sheet')).toBeTruthy();
    await screen.unmount();
  });

  it('keeps the order unchanged when the driver cancels the camera', async () => {
    mockLaunchCameraAsync.mockResolvedValueOnce({ canceled: true });
    const onExecuteTask = jest.fn();
    const onSelectProof = jest.fn(async () => true);
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
    await fireEvent.press(screen.getByTestId('btn-source-camera'));

    // No capture -> no review sheet, no upload, no transition.
    await waitFor(() => expect(screen.queryByTestId('proof-capture-sheet')).toBeNull());
    expect(onSelectProof).not.toHaveBeenCalled();
    expect(onExecuteTask).not.toHaveBeenCalled();
    await screen.unmount();
  });

  it('lets the driver retake, reopening the camera from the review sheet', async () => {
    const onExecuteTask = jest.fn();
    const onSelectProof = jest.fn(async () => true);
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
    await fireEvent.press(screen.getByTestId('btn-source-camera'));
    await screen.findByTestId('proof-capture-sheet');

    mockLaunchCameraAsync.mockResolvedValueOnce({
      canceled: false,
      assets: [
        {
          uri: 'file:///var/mobile/retaken-proof.jpg',
          fileName: 'retaken-proof.jpg',
          mimeType: 'image/jpeg',
          fileSize: 190_000,
        },
      ],
    });
    await fireEvent.press(screen.getByTestId('btn-retake-proof'));
    await fireEvent.press(screen.getByTestId('btn-source-camera'));

    await waitFor(() =>
      expect(screen.getByTestId('proof-capture-photo').props.source).toEqual({
        uri: 'file:///var/mobile/retaken-proof.jpg',
      }),
    );
    expect(onExecuteTask).not.toHaveBeenCalled();
    await screen.unmount();
  });

  it('offers DELIVERED only in the persisted-proof snapshot', async () => {
    const onExecuteTask = jest.fn();
    const screen = await render(
      <DriverOrderDetailScreen
        onExecuteTask={onExecuteTask}
        view={createDriverDetailFixture('D-DETAIL-READY-DELIVER')}
      />,
    );

    expect(screen.getByTestId('route-map-schematic')).toBeTruthy();
    await fireEvent(screen.getByTestId('btn-advance-leg-slide'), 'accessibilityAction', {
      nativeEvent: { actionName: 'activate' },
    });
    expect(onExecuteTask).toHaveBeenCalledWith('cmd-deliver-demo');
    await screen.unmount();
  });

  it('shows location permission recovery through an injected native port callback', async () => {
    const onOpenLocationSettings = jest.fn();
    const screen = await render(
      <DriverOrderDetailScreen
        onOpenLocationSettings={onOpenLocationSettings}
        view={createDriverDetailFixture('D-DETAIL-LOCATION-DENIED')}
      />,
    );
    expect(screen.getAllByText('Chưa được phép dùng vị trí').length).toBeGreaterThanOrEqual(1);
    await fireEvent.press(screen.getByRole('button', { name: 'Mở cài đặt vị trí' }));
    expect(onOpenLocationSettings).toHaveBeenCalledTimes(1);
    await screen.unmount();
  });

  it('hides every private field for a foreign assigned order', async () => {
    const screen = await render(
      <DriverOrderDetailScreen view={createDriverDetailFixture('D-DETAIL-PERMISSION')} />,
    );
    expect(screen.getByText('Bạn không có quyền xem đơn này')).toBeTruthy();
    expect(screen.queryByText('Kho riêng tư mô phỏng tại Quận 7')).toBeNull();
    expect(screen.queryByText('Ảnh xác nhận đã tải lên')).toBeNull();
    await screen.unmount();
  });

  it('renders cash confirmation card and triggers onConfirmCashPayment for cash orders', async () => {
    const onConfirmCashPayment = jest.fn();
    const baseFixture = createDriverDetailFixture('D-DETAIL-READY-DELIVER') as any;
    const cashView = {
      ...baseFixture,
      order: {
        ...baseFixture.order,
        paymentMethod: 'CASH',
        paymentStatus: 'PENDING',
        isCashConfirmed: false,
        priceVnd: 280000,
        driverPayoutVnd: 238000,
      },
    };

    const screen = await render(
      <DriverOrderDetailScreen
        onConfirmCashPayment={onConfirmCashPayment}
        view={cashView}
      />,
    );

    expect(screen.getByTestId('cash-collection-container')).toBeTruthy();
    expect(screen.getByText('Chưa thu COD')).toBeTruthy();
    expect(screen.getByText('280.000 ₫')).toBeTruthy();

    const confirmBtn = screen.getByTestId('btn-confirm-cash');
    expect(confirmBtn).toBeTruthy();
    await fireEvent.press(confirmBtn);
    expect(onConfirmCashPayment).toHaveBeenCalledTimes(1);

    await screen.unmount();
  });

  it('shows confirmed status pill and hides action button when cash is already confirmed', async () => {
    const baseFixture = createDriverDetailFixture('D-DETAIL-READY-DELIVER') as any;
    const cashConfirmedView = {
      ...baseFixture,
      order: {
        ...baseFixture.order,
        paymentMethod: 'CASH',
        paymentStatus: 'PAID',
        isCashConfirmed: true,
        priceVnd: 280000,
      },
    };

    const screen = await render(
      <DriverOrderDetailScreen view={cashConfirmedView} />,
    );

    expect(screen.getByTestId('cash-collection-container')).toBeTruthy();
    expect(screen.getAllByText('Đã thu COD').length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByTestId('btn-confirm-cash')).toBeNull();

    await screen.unmount();
  });
});
