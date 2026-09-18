import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, cleanup, fireEvent, render, waitFor } from '@testing-library/react-native';

import type { DriverAssignedDetailView, DriverDetailView } from './model';

const mockRouterBack = jest.fn();
jest.mock('expo-router', () => ({ useRouter: () => ({ back: mockRouterBack }) }));
// The proof flow opens the real device camera and stamps the real GPS fix.
jest.mock('expo-image-picker', () => ({
  requestCameraPermissionsAsync: async () => ({ granted: true }),
  requestMediaLibraryPermissionsAsync: async () => ({ granted: true }),
  launchCameraAsync: async () => ({
    canceled: false,
    assets: [
      {
        uri: 'file:///var/mobile/audit-proof.jpg',
        fileName: 'audit-proof.jpg',
        mimeType: 'image/jpeg',
        fileSize: 180_000,
      },
    ],
  }),
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
jest.mock('./adapter', () => ({
  createDriverHttpAdapter: jest.fn(),
  createDriverProofAdapter: jest.fn(),
}));
jest.mock('./tracking-sender', () => ({
  isTrackingEligibleStatus: () => false,
  createDriverTrackingSender: () => ({
    observeHealth: () => ({ unsubscribe: jest.fn() }),
    start: jest.fn(),
    handleOrderStatusChange: jest.fn(),
    destroy: jest.fn(),
  }),
}));

import { createDriverHttpAdapter, createDriverProofAdapter } from './adapter';
import { DriverOrderDetailRuntime } from './DriverOrderDetailRuntime';
import { createDriverDetailFixture } from './fixtures';

// Audit expectations express desired behavior. Known failures are deliberately
// retained as regression evidence; these mocks replace only external ports.
describe('DriverOrderDetailRuntime audit: asynchronous user actions', () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  const orderId = '22222222-2222-4222-8222-222222222001';
  const getOrderDetailView = jest.fn<() => Promise<DriverDetailView>>();
  const executeLifecycle = jest.fn<() => Promise<DriverDetailView>>();
  const selectProof = jest.fn(async () => ({ uri: 'file:///proof.jpg', name: 'proof.jpg' }));
  const uploadProof = jest.fn(async () => ({
    kind: 'persisted', label: 'Ảnh xác nhận đã tải lên', message: 'Upload confirmed',
    fileLabel: 'proof.jpg', mediaId: 'audit-media-001',
  }));

  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(createDriverHttpAdapter).mockReturnValue({
      getOrderDetailView, executeLifecycle,
    } as unknown as ReturnType<typeof createDriverHttpAdapter>);
    jest.mocked(createDriverProofAdapter).mockReturnValue({
      selectProof, uploadProof,
    } as unknown as ReturnType<typeof createDriverProofAdapter>);
  });
  afterEach(async () => {
    await cleanup();
    client.clear();
  });

  async function mount() {
    return render(
      <QueryClientProvider client={client}>
        <DriverOrderDetailRuntime orderId={orderId} />
      </QueryClientProvider>,
    );
  }

  it('control: renders the next lifecycle action after a successful status response', async () => {
    getOrderDetailView.mockResolvedValue(createDriverDetailFixture('D-DETAIL-ACCEPTED'));
    executeLifecycle.mockResolvedValue(createDriverDetailFixture('D-DETAIL-PICKING-UP'));
    const screen = await mount();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Bắt đầu đi lấy hàng' })).toBeTruthy());
    await fireEvent.press(screen.getByRole('button', { name: 'Bắt đầu đi lấy hàng' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Đã lấy hàng — bắt đầu giao' })).toBeTruthy());
    expect(executeLifecycle).toHaveBeenCalledTimes(1);
  });

  it('offers DELIVERED immediately after proof upload without requiring refresh', async () => {
    getOrderDetailView.mockResolvedValue(createDriverDetailFixture('D-DETAIL-PROOF-REQUIRED'));
    // The transition runs only after the upload is accepted, so its response is
    // what the driver ends up seeing.
    executeLifecycle.mockResolvedValue(createDriverDetailFixture('D-DETAIL-TERMINAL-DELIVERED'));
    const screen = await mount();
    // Swipe (or press) opens the camera, then the review sheet confirms the upload.
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Thêm ảnh xác nhận giao hàng' })).toBeTruthy(),
    );
    await fireEvent.press(screen.getByRole('button', { name: 'Thêm ảnh xác nhận giao hàng' }));
    await waitFor(() => expect(screen.getByTestId('proof-capture-sheet')).toBeTruthy());
    await fireEvent.press(screen.getByTestId('btn-confirm-proof'));

    // Uploaded exactly once, with the captured file, and never via a second
    // picker pass.
    await waitFor(() => expect(uploadProof).toHaveBeenCalledTimes(1));
    expect(uploadProof).toHaveBeenCalledWith(`cmd-select-proof-${orderId}`, expect.anything());
    expect(selectProof).not.toHaveBeenCalled();

    // The upload is what promotes the order to the delivery command, and that
    // command is the one executed — not the stale proof task.
    await waitFor(() => expect(executeLifecycle).toHaveBeenCalledWith(`cmd-deliver-${orderId}`));
  });

  it('uploads pickup evidence to the pickup endpoint and then advances to IN_TRANSIT', async () => {
    const baseFixture = createDriverDetailFixture('D-DETAIL-PICKING-UP') as DriverAssignedDetailView;
    // The real adapter swaps the transit task for a pickup capture while the
    // order sits at PICKING_UP. Reproduce that shape exactly.
    const pickupCaptureView: DriverDetailView = {
      ...baseFixture,
      proof: {
        kind: 'required',
        label: 'Cần ảnh xác nhận đã lấy hàng',
        message: 'Chụp ảnh hàng hóa tại điểm lấy.',
        fileLabel: null,
      },
      primaryTask: {
        kind: 'upload-proof',
        command: {
          id: `cmd-select-pickup-proof-${orderId}`,
          orderId,
          label: 'Chụp ảnh xác nhận đã lấy hàng',
        },
      },
      offeredLifecycleCommand: null,
    };
    getOrderDetailView.mockResolvedValue(pickupCaptureView);
    executeLifecycle.mockResolvedValue(createDriverDetailFixture('D-DETAIL-IN-TRANSIT'));

    const screen = await mount();
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: 'Chụp ảnh xác nhận đã lấy hàng' }),
      ).toBeTruthy(),
    );
    await fireEvent.press(screen.getByRole('button', { name: 'Chụp ảnh xác nhận đã lấy hàng' }));
    await waitFor(() => expect(screen.getByTestId('proof-capture-sheet')).toBeTruthy());
    await fireEvent.press(screen.getByTestId('btn-confirm-proof'));

    // The pickup photo must reach the pickup command, never the delivery one.
    await waitFor(() => expect(uploadProof).toHaveBeenCalledTimes(1));
    expect(uploadProof).toHaveBeenCalledWith(
      `cmd-select-pickup-proof-${orderId}`,
      expect.anything(),
    );

    // And the leg that opens next is delivery, not DELIVERED.
    await waitFor(() =>
      expect(executeLifecycle).toHaveBeenCalledWith(`cmd-transit-${orderId}`),
    );
    expect(executeLifecycle).not.toHaveBeenCalledWith(`cmd-deliver-${orderId}`);
  });

  it('sends only one lifecycle mutation while the first request is pending', async () => {
    getOrderDetailView.mockResolvedValue(createDriverDetailFixture('D-DETAIL-ACCEPTED'));
    let resolveRequest!: (view: DriverDetailView) => void;
    executeLifecycle.mockImplementation(() => new Promise((resolve) => { resolveRequest = resolve; }));
    const screen = await mount();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Bắt đầu đi lấy hàng' })).toBeTruthy());
    await fireEvent.press(screen.getByRole('button', { name: 'Bắt đầu đi lấy hàng' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Bắt đầu đi lấy hàng' }));
    const requestCount = executeLifecycle.mock.calls.length;
    await act(async () => resolveRequest(createDriverDetailFixture('D-DETAIL-PICKING-UP')));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Đã lấy hàng — bắt đầu giao' })).toBeTruthy());
    expect(requestCount).toBe(1);
  });

  it('invalidates the driver orders list and navigates back after a DELIVERED transition', async () => {
    const baseFixture = createDriverDetailFixture('D-DETAIL-READY-DELIVER') as DriverAssignedDetailView;
    getOrderDetailView.mockResolvedValue(baseFixture);
    const deliveredView: DriverDetailView = {
      ...baseFixture,
      order: { ...baseFixture.order, status: 'DELIVERED' },
    };
    executeLifecycle.mockResolvedValue(deliveredView);
    const invalidateSpy = jest.spyOn(client, 'invalidateQueries');

    const screen = await mount();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Xác nhận đã giao' })).toBeTruthy());
    await fireEvent.press(screen.getByRole('button', { name: 'Xác nhận đã giao' }));

    await waitFor(() =>
      expect(invalidateSpy).toHaveBeenCalledWith(
        expect.objectContaining({ queryKey: ['driver', 'orders'] }),
      ),
    );
    await waitFor(() => expect(screen.getByRole('button', { name: 'Về trang chủ' })).toBeTruthy());
    await fireEvent.press(screen.getByRole('button', { name: 'Về trang chủ' }));
    expect(mockRouterBack).toHaveBeenCalledTimes(1);
  });

  it('does NOT navigate away or invalidate the list on a non-terminal transition', async () => {
    getOrderDetailView.mockResolvedValue(createDriverDetailFixture('D-DETAIL-ACCEPTED'));
    executeLifecycle.mockResolvedValue(createDriverDetailFixture('D-DETAIL-PICKING-UP'));
    const invalidateSpy = jest.spyOn(client, 'invalidateQueries');
    invalidateSpy.mockClear();
    mockRouterBack.mockClear();

    const screen = await mount();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Bắt đầu đi lấy hàng' })).toBeTruthy());
    await fireEvent.press(screen.getByRole('button', { name: 'Bắt đầu đi lấy hàng' }));

    await waitFor(() => expect(screen.getByRole('button', { name: 'Đã lấy hàng — bắt đầu giao' })).toBeTruthy());
    expect(invalidateSpy).not.toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: ['driver', 'orders'] }),
    );
    expect(mockRouterBack).not.toHaveBeenCalled();
  });

  it('navigates back when the conflict view\'s recovery action is triggered', async () => {
    getOrderDetailView.mockResolvedValue({
      scenarioId: 'D-DETAIL-VEHICLE-MISMATCH',
      kind: 'conflict',
      title: 'Đơn không phù hợp với loại xe của bạn',
      message: 'Đơn hàng này yêu cầu loại phương tiện khác.',
      recoveryLabel: 'Xem đơn còn trống',
    } as DriverDetailView);
    mockRouterBack.mockClear();

    const screen = await mount();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Xem đơn còn trống' })).toBeTruthy());
    await fireEvent.press(screen.getByRole('button', { name: 'Xem đơn còn trống' }));

    expect(mockRouterBack).toHaveBeenCalledTimes(1);
  });
});
