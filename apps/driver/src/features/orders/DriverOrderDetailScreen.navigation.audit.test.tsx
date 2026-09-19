import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render } from '@testing-library/react-native';
import React from 'react';
import { Linking } from 'react-native';

import { DriverOrderDetailScreen } from './DriverOrderDetailScreen';
import { createDriverDetailFixture } from './fixtures';
import type { DriverAssignedDetailView } from './model';

describe('DriverOrderDetailScreen navigation audit (D-05)', () => {
  it('navigates to pickup point coordinates when order status is ACCEPTED', async () => {
    const openURLSpy = jest.spyOn(Linking, 'openURL').mockResolvedValue(true as any);

    const baseFixture = createDriverDetailFixture('D-DETAIL-ACCEPTED') as DriverAssignedDetailView;
    const view: DriverAssignedDetailView = {
      ...baseFixture,
      order: {
        ...baseFixture.order,
        status: 'ACCEPTED',
        route: {
          ...baseFixture.order.route,
          origin: {
            id: 'p-1',
            label: 'Kho Tân Phú',
            lat: 10.7925,
            lng: 106.6341,
          },
          destination: {
            id: 'd-1',
            label: 'Công trình Thủ Đức',
            lat: 10.8012,
            lng: 106.7456,
          },
        },
      },
    };

    const screen = await render(<DriverOrderDetailScreen view={view} />);

    // Click sticky navigation button
    const navBtn = screen.getByTestId('btn-navigate-active-leg');
    await fireEvent.press(navBtn);

    expect(openURLSpy).toHaveBeenCalledWith(
      expect.stringContaining('10.7925%2C106.6341'),
    );

    openURLSpy.mockRestore();
    await screen.unmount();
  });

  it('navigates to dropoff point coordinates when order status is IN_TRANSIT with no intermediate stops', async () => {
    const openURLSpy = jest.spyOn(Linking, 'openURL').mockResolvedValue(true as any);

    const baseFixture = createDriverDetailFixture('D-DETAIL-IN-TRANSIT') as DriverAssignedDetailView;
    const view: DriverAssignedDetailView = {
      ...baseFixture,
      order: {
        ...baseFixture.order,
        status: 'IN_TRANSIT',
        route: {
          ...baseFixture.order.route,
          stops: [],
          origin: {
            id: 'p-1',
            label: 'Kho Tân Phú',
            lat: 10.7925,
            lng: 106.6341,
          },
          destination: {
            id: 'd-1',
            label: 'Công trình Thủ Đức',
            lat: 10.8012,
            lng: 106.7456,
          },
        },
      },
    };

    const screen = await render(<DriverOrderDetailScreen view={view} />);

    const navBtn = screen.getByTestId('btn-navigate-active-leg');
    await fireEvent.press(navBtn);

    expect(openURLSpy).toHaveBeenCalledWith(
      expect.stringContaining('10.8012%2C106.7456'),
    );

    openURLSpy.mockRestore();
    await screen.unmount();
  });

  it('navigates to next intermediate stop coordinates when intermediate stops are pending', async () => {
    const openURLSpy = jest.spyOn(Linking, 'openURL').mockResolvedValue(true as any);

    const baseFixture = createDriverDetailFixture('D-DETAIL-IN-TRANSIT') as DriverAssignedDetailView;
    const screen = await render(<DriverOrderDetailScreen view={baseFixture} />);

    const navBtn = screen.getByTestId('btn-navigate-active-leg');
    await fireEvent.press(navBtn);

    // Stop 2 in fixture is ARRIVED (not completed), so navigation must target Stop 2 (10.7895, 106.6781)
    expect(openURLSpy).toHaveBeenCalledWith(
      expect.stringContaining('10.7895%2C106.6781'),
    );

    openURLSpy.mockRestore();
    await screen.unmount();
  });

  it('triggers onRecordStopProgress when driver slides the action slider on a pending stop', async () => {
    const onRecordStopProgress =
      jest.fn<
        (
          stopId: string,
          step: 'ARRIVED' | 'SERVICE_STARTED' | 'SERVICE_COMPLETED',
        ) => void
      >();
    const baseFixture = createDriverDetailFixture('D-DETAIL-IN-TRANSIT') as DriverAssignedDetailView;

    const viewWithStopTask: DriverAssignedDetailView = {
      ...baseFixture,
      primaryTask: {
        kind: 'record-stop',
        stopId: 'driver-stop-2',
        step: 'SERVICE_STARTED',
        sequence: 2,
        command: {
          id: 'cmd-stop-driver-stop-2-SERVICE_STARTED',
          orderId: baseFixture.order.id,
          label: 'Bắt đầu bốc/dỡ tại điểm 2',
        },
      },
    };

    const screen = await render(
      <DriverOrderDetailScreen
        onRecordStopProgress={onRecordStopProgress}
        view={viewWithStopTask}
      />,
    );

    expect(screen.getAllByText('Bắt đầu bốc/dỡ tại điểm 2').length).toBeGreaterThan(0);

    const slider = screen.getByTestId('btn-advance-leg-slide');
    await fireEvent(slider, 'accessibilityAction', {
      nativeEvent: { actionName: 'activate' },
    });

    expect(onRecordStopProgress).toHaveBeenCalledWith('driver-stop-2', 'SERVICE_STARTED');
    await screen.unmount();
  });
});

