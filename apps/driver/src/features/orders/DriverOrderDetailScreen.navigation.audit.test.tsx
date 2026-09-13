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

  it('navigates to dropoff point coordinates when order status is IN_TRANSIT', async () => {
    const openURLSpy = jest.spyOn(Linking, 'openURL').mockResolvedValue(true as any);

    const baseFixture = createDriverDetailFixture('D-DETAIL-IN-TRANSIT') as DriverAssignedDetailView;
    const view: DriverAssignedDetailView = {
      ...baseFixture,
      order: {
        ...baseFixture.order,
        status: 'IN_TRANSIT',
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

    const navBtn = screen.getByTestId('btn-navigate-active-leg');
    await fireEvent.press(navBtn);

    expect(openURLSpy).toHaveBeenCalledWith(
      expect.stringContaining('10.8012%2C106.7456'),
    );

    openURLSpy.mockRestore();
    await screen.unmount();
  });
});
