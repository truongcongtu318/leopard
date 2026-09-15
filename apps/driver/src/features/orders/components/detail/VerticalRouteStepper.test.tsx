import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { cleanup, fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';

import { VerticalRouteStepper } from './VerticalRouteStepper';
import type { DriverRouteStopView } from '../../model';

describe('VerticalRouteStepper (Task 20)', () => {
  afterEach(async () => {
    await cleanup();
    jest.restoreAllMocks();
  });

  const mockStops: DriverRouteStopView[] = [
    {
      id: 'stop-1',
      stopId: 'stop-1',
      sequence: 1,
      address: 'Điểm lấy phụ — 100 CMT8',
      label: 'Điểm lấy phụ — 100 CMT8',
      progress: 'COMPLETED',
    },
    {
      id: 'stop-2',
      stopId: 'stop-2',
      sequence: 2,
      address: 'Điểm giao 1 — 200 Hai Bà Trưng',
      label: 'Điểm giao 1 — 200 Hai Bà Trưng',
      progress: 'ARRIVED',
    },
    {
      id: 'stop-3',
      stopId: 'stop-3',
      sequence: 3,
      address: 'Điểm giao 2 — 300 Nguyễn Thị Minh Khai',
      label: 'Điểm giao 2 — 300 Nguyễn Thị Minh Khai',
      progress: 'PENDING',
    },
  ];

  it('renders origin, intermediate stops with sequences, and destination', async () => {
    await render(
      <VerticalRouteStepper
        destination={{ label: 'Kho Tổng Thủ Đức' }}
        origin={{ label: 'Kho Gốc Bình Tân' }}
        status="IN_TRANSIT"
        stops={mockStops}
      />,
    );

    expect(screen.getByText('Kho Gốc Bình Tân')).toBeTruthy();
    expect(screen.getByText('Kho Tổng Thủ Đức')).toBeTruthy();

    expect(screen.getByTestId('stop-node-1')).toBeTruthy();
    expect(screen.getByTestId('stop-node-2')).toBeTruthy();
    expect(screen.getByTestId('stop-node-3')).toBeTruthy();

    // Check badges
    expect(screen.getByTestId('stop-badge-completed-1')).toBeTruthy();
    expect(screen.getByTestId('stop-badge-arrived-2')).toBeTruthy();
    expect(screen.getByTestId('stop-badge-pending-3')).toBeTruthy();
  });

  it('renders action button only for the active actionable stop with next step', async () => {
    const onRecordProgress = jest.fn((_stopId: string, _step: string) => {});

    await render(
      <VerticalRouteStepper
        destination={{ label: 'Kho Tổng Thủ Đức' }}
        onRecordProgress={onRecordProgress}
        origin={{ label: 'Kho Gốc Bình Tân' }}
        status="IN_TRANSIT"
        stops={mockStops}
      />,
    );

    // Stop 2 is ARRIVED, so next step is SERVICE_STARTED ("Bắt đầu bốc/dỡ")
    const actionBtn = screen.getByTestId('btn-stop-progress-2');
    expect(actionBtn).toBeTruthy();
    expect(screen.getByText('Bắt đầu bốc/dỡ')).toBeTruthy();

    // Stop 1 (COMPLETED) and Stop 3 (pending after stop 2) must not have action buttons
    expect(screen.queryByTestId('btn-stop-progress-1')).toBeNull();
    expect(screen.queryByTestId('btn-stop-progress-3')).toBeNull();

    // Tap action button
    fireEvent.press(actionBtn);
    expect(onRecordProgress).toHaveBeenCalledWith('stop-2', 'SERVICE_STARTED');
  });

  it('renders busy state when inFlightCommand matches the active stop', async () => {
    await render(
      <VerticalRouteStepper
        destination={{ label: 'Kho Tổng Thủ Đức' }}
        inFlightCommand={{ stopId: 'stop-2', step: 'SERVICE_STARTED' }}
        onRecordProgress={jest.fn((_stopId: string, _step: string) => {})}
        origin={{ label: 'Kho Gốc Bình Tân' }}
        status="IN_TRANSIT"
        stops={mockStops}
      />,
    );

    const actionBtn = screen.getByTestId('btn-stop-progress-2');
    expect(actionBtn.props.accessibilityState.busy).toBe(true);
    expect(actionBtn.props.accessibilityState.disabled).toBe(true);
  });

  it('renders origin as active when status is PICKING_UP', async () => {
    await render(
      <VerticalRouteStepper
        destination={{ label: 'Kho Tổng Thủ Đức' }}
        origin={{ label: 'Kho Gốc Bình Tân' }}
        status="PICKING_UP"
        stops={[]}
      />,
    );

    expect(screen.getByTestId('node-origin-active')).toBeTruthy();
    expect(screen.getByText('CHẶNG HIỆN TẠI')).toBeTruthy();
  });

  it('renders destination as completed when status is DELIVERED', async () => {
    await render(
      <VerticalRouteStepper
        destination={{ label: 'Kho Tổng Thủ Đức' }}
        origin={{ label: 'Kho Gốc Bình Tân' }}
        status="DELIVERED"
        stops={[]}
      />,
    );

    expect(screen.getByText('ĐÃ GIAO HÀNG TẠI')).toBeTruthy();
  });
});
