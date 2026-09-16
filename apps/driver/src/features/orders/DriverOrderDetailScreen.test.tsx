import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, within } from '@testing-library/react-native';
import React from 'react';
import { DriverOrderDetailScreen } from './DriverOrderDetailScreen';
import { createDriverDetailFixture } from './fixtures';
import type { DriverAssignedDetailView } from './model';

describe('DriverOrderDetailScreen 4-stage Cockpit and e-POD', () => {
  it('Stage 1: ACCEPTED shows pickup info, sender contact, and slide-to-action to PICKING_UP', async () => {
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

    // Shows pickup address
    expect(screen.getByText('Kho Gốc Tân Bình, 123 Lý Thường Kiệt')).toBeTruthy();

    // Contact button for sender
    expect(screen.getByLabelText('Gọi cho người nhận')).toBeTruthy();

    // SlideToAction for Stage 1
    const slider = screen.getByTestId('btn-advance-leg-slide');
    expect(slider).toBeTruthy();
    expect(screen.getByText('Vuốt đã tới điểm lấy hàng ➔')).toBeTruthy();

    // Swiping or activating executes command
    await fireEvent(slider, 'accessibilityAction', {
      nativeEvent: { actionName: 'activate' },
    });
    expect(onExecuteTask).toHaveBeenCalledWith('cmd-pickup-demo');

    await screen.unmount();
  });

  it('Stage 2: PICKING_UP shows cargo specs checklist, preloading photo capture, and slide-to-action to IN_TRANSIT', async () => {
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

    // Cargo specs checklist
    const checklist = screen.getByTestId('cargo-specs-checklist');
    expect(checklist).toBeTruthy();
    expect(within(checklist).getByText('20 bao xi măng Hà Tiên')).toBeTruthy();
    expect(within(checklist).getByText(/1000\s*kg/)).toBeTruthy();
    expect(within(checklist).getByText('Phí bốc xếp:')).toBeTruthy();

    // Pre-loading cargo photo capture button to prevent dispute
    const preloadingPhotoBtn = screen.getByTestId('btn-preloading-cargo-photo');
    expect(preloadingPhotoBtn).toBeTruthy();
    await fireEvent.press(preloadingPhotoBtn);
    expect(screen.getByText(/Đã chụp ảnh kiểm hàng/i)).toBeTruthy();

    // SlideToAction for Stage 2
    const slider = screen.getByTestId('btn-advance-leg-slide');
    expect(slider).toBeTruthy();
    expect(screen.getByText('Vuốt đã bốc xong - Bắt đầu giao ➔')).toBeTruthy();

    // Swiping or activating executes command
    await fireEvent(slider, 'accessibilityAction', {
      nativeEvent: { actionName: 'activate' },
    });
    expect(onExecuteTask).toHaveBeenCalledWith('cmd-transit-demo');

    await screen.unmount();
  });

  it('Stage 3: IN_TRANSIT shows dropoff address, ETA label, contact recipient, and slide-to-action to DELIVERED', async () => {
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

    // Dropoff address
    expect(screen.getByText('Công trình Landmark 81, Bình Thạnh')).toBeTruthy();

    // ETA label
    expect(screen.getByText(/phút|ETA/i)).toBeTruthy();

    // Contact button
    expect(screen.getByLabelText('Gọi cho người nhận')).toBeTruthy();

    // SlideToAction for Stage 3
    const slider = screen.getByTestId('btn-advance-leg-slide');
    expect(slider).toBeTruthy();
    expect(screen.getByText('Vuốt đã tới điểm giao hàng ➔')).toBeTruthy();

    await fireEvent(slider, 'accessibilityAction', {
      nativeEvent: { actionName: 'activate' },
    });
    expect(onExecuteTask).toHaveBeenCalledWith('cmd-deliver-demo');

    await screen.unmount();
  });

  it('Stage 4: EpodPanel supports cargo photo, recipient name input, signature, payment reminder, and completion slider', async () => {
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

    // EpodPanel container
    expect(screen.getByTestId('epod-verification-container')).toBeTruthy();

    // Payment collection reminder in EpodPanel
    const paymentReminder = screen.getByTestId('epod-payment-reminder');
    expect(paymentReminder).toBeTruthy();
    expect(within(paymentReminder).getByText(/350.000 ₫/)).toBeTruthy();

    // Recipient name input
    const nameInput = screen.getByTestId('epod-recipient-name-input');
    expect(nameInput).toBeTruthy();
    await fireEvent.changeText(nameInput, 'Anh Tuấn - Chỉ huy trưởng');
    expect(screen.getByDisplayValue('Anh Tuấn - Chỉ huy trưởng')).toBeTruthy();

    // Photo capture
    await fireEvent.press(screen.getByTestId('btn-capture-cargo-photo'));
    expect(screen.getByTestId('camera-watermark-overlay')).toBeTruthy();

    // Signature pad
    await fireEvent.press(screen.getByTestId('epod-signature-pad'));
    expect(screen.getByText('ĐỦ ĐIỀU KIỆN')).toBeTruthy();

    // Action SlideToAction with label "Vuốt hoàn tất cuốc xe ➔" and colorVariant success
    const epodSlider = screen.getByTestId('btn-epod-complete-delivery');
    expect(epodSlider).toBeTruthy();
    expect(screen.getByText('Vuốt hoàn tất cuốc xe ➔')).toBeTruthy();

    await fireEvent(epodSlider, 'accessibilityAction', {
      nativeEvent: { actionName: 'activate' },
    });
    expect(onExecuteTask).toHaveBeenCalled();

    await screen.unmount();
  });

  it('Stage 4 non-COD shows "Đã thanh toán qua VietQR" reminder', async () => {
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
    expect(screen.getByText('Đã thanh toán qua VietQR')).toBeTruthy();
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
    expect(screen.getByText('Vuốt đã hoàn hàng về điểm gửi ➔')).toBeTruthy();

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
});
