import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, waitFor, within } from '@testing-library/react-native';
import React from 'react';
import { DriverOrderDetailScreen } from './DriverOrderDetailScreen';
import { createDriverDetailFixture } from './fixtures';
import type { DriverAssignedDetailView } from './model';

// The POD flow captures from the real device camera and stamps the driver's
// real GPS position, so both native modules are stubbed here.
jest.mock('expo-location', () => ({
  Accuracy: { High: 6, Balanced: 3 },
  requestForegroundPermissionsAsync: async () => ({ status: 'granted' }),
  getCurrentPositionAsync: async () => ({
    coords: { latitude: 10.7626, longitude: 106.6602 },
  }),
  watchPositionAsync: async () => ({ remove: () => {} }),
}));

jest.mock('expo-image-picker', () => ({
  requestCameraPermissionsAsync: async () => ({ granted: true }),
  requestMediaLibraryPermissionsAsync: async () => ({ granted: true }),
  launchCameraAsync: async () => ({
    canceled: false,
    assets: [
      {
        uri: 'file:///var/mobile/cargo-proof.jpg',
        fileName: 'cargo-proof.jpg',
        mimeType: 'image/jpeg',
        fileSize: 180_000,
      },
    ],
  }),
  launchImageLibraryAsync: async () => ({ canceled: true }),
  CameraType: { back: 'back' },
  MediaTypeOptions: { Images: 'Images' },
}));

describe('DriverOrderDetailScreen 4-stage Cockpit and e-POD', () => {
  it('Stage 1: ACCEPTED shows sender contact and slide-to-action to PICKING_UP', async () => {
    const onExecuteTask = jest.fn();
    const base = createDriverDetailFixture('D-DETAIL-ACCEPTED') as DriverAssignedDetailView;
    const view: DriverAssignedDetailView = {
      ...base,
      order: {
        ...base.order,
        status: 'ACCEPTED',
        customerContact: 'Kho Tổng Nam (0912345678)',
        route: {
          ...base.order.route,
          origin: {
            id: 'orig-1',
            label: 'Kho Gốc Tân Bình, 123 Lý Thường Kiệt',
            lat: 10.79,
            lng: 106.65,
          },
        },
      },
      primaryTask: {
        kind: 'advance-lifecycle',
        command: {
          id: 'cmd-pickup-demo',
          orderId: base.order.id,
          label: 'Bắt đầu đi lấy hàng',
          targetStatus: 'PICKING_UP',
        },
      },
    };

    const screen = await render(
      <DriverOrderDetailScreen onExecuteTask={onExecuteTask} view={view} />,
    );

    // The pickup address is no longer repeated in the sheet as text — the map
    // HUD carries it — and the removed glance card leaves no address block.
    expect(screen.queryByTestId('active-leg-glance-card')).toBeNull();
    expect(screen.queryByText('Kho Gốc Tân Bình, 123 Lý Thường Kiệt')).toBeNull();

    // Contact button for sender
    expect(screen.getByLabelText('Gọi cho người nhận')).toBeTruthy();

    // SlideToAction for Stage 1
    const slider = screen.getByTestId('btn-advance-leg-slide');
    expect(slider).toBeTruthy();
    expect(screen.getByText('Đã tới điểm lấy hàng')).toBeTruthy();

    // Swiping or activating executes command
    await fireEvent(slider, 'accessibilityAction', {
      nativeEvent: { actionName: 'activate' },
    });
    expect(onExecuteTask).toHaveBeenCalledWith('cmd-pickup-demo');

    await screen.unmount();
  });

  it('Stage 2: PICKING_UP shows cargo in the map header and slide-to-action to IN_TRANSIT', async () => {
    const onExecuteTask = jest.fn();
    const base = createDriverDetailFixture('D-DETAIL-PICKING-UP') as DriverAssignedDetailView;
    const view: DriverAssignedDetailView = {
      ...base,
      order: {
        ...base.order,
        status: 'PICKING_UP',
        cargoSummary: '20 bao xi măng Hà Tiên',
        cargoWeightKg: 1000,
      },
      primaryTask: {
        kind: 'advance-lifecycle',
        command: {
          id: 'cmd-transit-demo',
          orderId: base.order.id,
          label: 'Đã lấy hàng — bắt đầu giao',
          targetStatus: 'IN_TRANSIT',
        },
      },
    };

    const screen = await render(
      <DriverOrderDetailScreen onExecuteTask={onExecuteTask} view={view} />,
    );

    // Cargo moved out of the sheet into a compact map-header chip, so the sheet
    // no longer repeats the destination address or the loading fee.
    const cargoChip = screen.getByTestId('cargo-header-chip');
    expect(cargoChip).toBeTruthy();
    expect(within(cargoChip).getByText(/20 bao xi măng Hà Tiên/)).toBeTruthy();
    expect(within(cargoChip).getByText(/1000\s*kg/)).toBeTruthy();
    expect(screen.queryByTestId('active-leg-glance-card')).toBeNull();
    expect(screen.queryByText('Phí bốc xếp:')).toBeNull();

    // No inline capture button: proof is driven by the swipe action, so the map
    // keeps its space and there is no bogus "already captured" claim.
    expect(screen.queryByTestId('btn-preloading-cargo-photo')).toBeNull();

    // SlideToAction for Stage 2
    const slider = screen.getByTestId('btn-advance-leg-slide');
    expect(slider).toBeTruthy();
    expect(screen.getByText('Bắt đầu giao hàng')).toBeTruthy();

    // Swiping or activating executes command
    await fireEvent(slider, 'accessibilityAction', {
      nativeEvent: { actionName: 'activate' },
    });
    expect(onExecuteTask).toHaveBeenCalledWith('cmd-transit-demo');

    await screen.unmount();
  });

  it('Stage 3: IN_TRANSIT shows ETA label, contact recipient, and slide-to-action to DELIVERED', async () => {
    const onExecuteTask = jest.fn();
    const base = createDriverDetailFixture('D-DETAIL-IN-TRANSIT') as DriverAssignedDetailView;
    const view: DriverAssignedDetailView = {
      ...base,
      order: {
        ...base.order,
        status: 'IN_TRANSIT',
        route: {
          ...base.order.route,
          destination: {
            id: 'dest-1',
            label: 'Công trình Landmark 81, Bình Thạnh',
            lat: 10.795,
            lng: 106.72,
          },
          etaDurationSeconds: 1500,
        },
      },
      primaryTask: {
        kind: 'advance-lifecycle',
        command: {
          id: 'cmd-deliver-demo',
          orderId: base.order.id,
          label: 'Xác nhận đã giao',
          targetStatus: 'DELIVERED',
        },
      },
    };

    const screen = await render(
      <DriverOrderDetailScreen onExecuteTask={onExecuteTask} view={view} />,
    );

    // The dropoff address is no longer repeated in the sheet as text; the map
    // HUD carries it, so the leg title and slide action are the sheet's job.
    expect(screen.queryByTestId('active-leg-glance-card')).toBeNull();
    expect(screen.queryByText('Công trình Landmark 81, Bình Thạnh')).toBeNull();

    // ETA label
    expect(screen.getAllByText(/phút|ETA/i).length).toBeGreaterThan(0);

    // Contact button
    expect(screen.getByLabelText('Gọi cho người nhận')).toBeTruthy();

    // SlideToAction for Stage 3
    const slider = screen.getByTestId('btn-advance-leg-slide');
    expect(slider).toBeTruthy();
    expect(screen.getByText('Đã tới điểm giao hàng')).toBeTruthy();

    await fireEvent(slider, 'accessibilityAction', {
      nativeEvent: { actionName: 'activate' },
    });
    expect(onExecuteTask).toHaveBeenCalledWith('cmd-deliver-demo');

    await screen.unmount();
  });

  it('runs the delivery POD in a dedicated modal, not an inline signature panel', async () => {
    const onExecuteTask = jest.fn();
    const base = createDriverDetailFixture('D-DETAIL-IN-TRANSIT') as DriverAssignedDetailView;
    const view: DriverAssignedDetailView = {
      ...base,
      order: {
        ...base.order,
        status: 'IN_TRANSIT',
        paymentMethod: 'CASH',
        priceLabel: '350.000 ₫',
      },
    };

    const screen = await render(
      <DriverOrderDetailScreen onExecuteTask={onExecuteTask} view={view} />,
    );

    // The placeholder e-POD panel is gone; the POD form is its own modal.
    expect(screen.queryByTestId('epod-verification-container')).toBeNull();
    expect(screen.queryByTestId('epod-signature-pad')).toBeNull();

    await screen.unmount();
  });

  it('shows the VietQR settlement banner in the delivery modal for prepaid orders', async () => {
    const base = createDriverDetailFixture('D-DETAIL-IN-TRANSIT') as DriverAssignedDetailView;
    const view: DriverAssignedDetailView = {
      ...base,
      order: {
        ...base.order,
        status: 'IN_TRANSIT',
        paymentMethod: 'VIETQR',
        paymentStatus: 'PAID',
      },
    };

    const screen = await render(<DriverOrderDetailScreen view={view} />);

    // There is no inline POD panel and no intermediate modal any more: the
    // swipe opens the camera and the review sheet follows the capture.
    expect(screen.queryByTestId('modal-delivery-verification')).toBeNull();
    expect(screen.queryByTestId('delivery-verification-view')).toBeNull();

    await screen.unmount();
  });

  it('Incident safety: Report incident button opens DriverIncidentModal', async () => {
    const onOpenIncidentModal = jest.fn();
    const base = createDriverDetailFixture('D-DETAIL-ACCEPTED') as DriverAssignedDetailView;

    const screen = await render(
      <DriverOrderDetailScreen
        onOpenIncidentModal={onOpenIncidentModal}
        view={base}
      />,
    );

    const reportBtn = screen.getByTestId('btn-open-incident-modal');
    await fireEvent.press(reportBtn);
    expect(onOpenIncidentModal).toHaveBeenCalled();

    await screen.unmount();
  });

  it('Return-to-pickup flow: RETURNING status shows return destination and return slide action', async () => {
    const onExecuteTask = jest.fn();
    const base = createDriverDetailFixture('D-DETAIL-ACCEPTED') as DriverAssignedDetailView;
    const view: DriverAssignedDetailView = {
      ...base,
      order: {
        ...base.order,
        status: 'RETURNING',
        route: {
          ...base.order.route,
          origin: {
            id: 'orig-return',
            label: 'Kho Gốc Xuất Phát Cần Trả Hàng',
            lat: 10.79,
            lng: 106.65,
          },
        },
      },
      primaryTask: {
        kind: 'advance-lifecycle',
        command: {
          id: 'cmd-return-demo',
          orderId: base.order.id,
          label: 'Xác nhận đã hoàn hàng',
          targetStatus: 'RETURNED',
        },
      },
    };

    const screen = await render(
      <DriverOrderDetailScreen onExecuteTask={onExecuteTask} view={view} />,
    );

    // Header indicates return flow
    expect(screen.getByText('HOÀN HÀNG VỀ ĐIỂM GỬI')).toBeTruthy();

    // Slide action for returning
    const slider = screen.getByTestId('btn-advance-leg-slide');
    expect(slider).toBeTruthy();
    expect(screen.getByText('Đã hoàn hàng về điểm gửi')).toBeTruthy();

    await fireEvent(slider, 'accessibilityAction', {
      nativeEvent: { actionName: 'activate' },
    });
    expect(onExecuteTask).toHaveBeenCalledWith('cmd-return-demo');

    await screen.unmount();
  });

  it('renders CompletedOrderDetailView when order is DELIVERED and has no pending command', async () => {
    const base = createDriverDetailFixture('D-DETAIL-ACCEPTED') as DriverAssignedDetailView;
    const view: DriverAssignedDetailView = {
      ...base,
      order: {
        ...base.order,
        status: 'DELIVERED',
        reference: 'ORD-TERM-123',
        priceLabel: '420.000 ₫',
      },
      primaryTask: null,
    };

    const screen = await render(<DriverOrderDetailScreen view={view} />);

    // Should show the title for receipt
    expect(screen.getByText('Biên bản đơn ORD-TERM-123')).toBeTruthy();
    expect(screen.getByText('420.000 ₫')).toBeTruthy();

    // Should NOT render driver active bottom controls
    expect(screen.queryByTestId('btn-navigate-active-leg')).toBeNull();
    expect(screen.queryByTestId('btn-open-incident-modal')).toBeNull();
    expect(screen.queryByTestId('btn-advance-leg-slide')).toBeNull();

    await screen.unmount();
  });

  it('opens ProofSourceSelectModal on proof action and allows selecting photo from library', async () => {
    const onSelectProof = jest.fn(async () => true);
    const onExecuteTask = jest.fn();
    const view = createDriverDetailFixture('D-DETAIL-PROOF-REQUIRED');

    const screen = await render(
      <DriverOrderDetailScreen
        onExecuteTask={onExecuteTask}
        onSelectProof={onSelectProof}
        view={view}
      />,
    );

    // Initial state: modal is not visible
    expect(screen.queryByTestId('proof-source-modal')).toBeNull();

    // Swipe / activate proof action
    await fireEvent(screen.getByTestId('btn-advance-leg-slide'), 'accessibilityAction', {
      nativeEvent: { actionName: 'activate' },
    });

    // Proof source modal opens with options
    expect(screen.getByTestId('proof-source-modal')).toBeTruthy();
    expect(screen.getByTestId('btn-source-camera')).toBeTruthy();
    expect(screen.getByTestId('btn-source-library')).toBeTruthy();

    // Driver can choose photo library
    await fireEvent.press(screen.getByTestId('btn-source-library'));

    // Modal closes
    await waitFor(() => expect(screen.queryByTestId('proof-source-modal')).toBeNull());

    await screen.unmount();
  });

  it('closes ProofSourceSelectModal and resets when driver taps close', async () => {
    const view = createDriverDetailFixture('D-DETAIL-PROOF-REQUIRED');

    const screen = await render(<DriverOrderDetailScreen view={view} />);

    await fireEvent(screen.getByTestId('btn-advance-leg-slide'), 'accessibilityAction', {
      nativeEvent: { actionName: 'activate' },
    });
    expect(screen.getByTestId('proof-source-modal')).toBeTruthy();

    await fireEvent.press(screen.getByTestId('btn-close-source-modal'));
    await waitFor(() => expect(screen.queryByTestId('proof-source-modal')).toBeNull());

    await screen.unmount();
  });
});
