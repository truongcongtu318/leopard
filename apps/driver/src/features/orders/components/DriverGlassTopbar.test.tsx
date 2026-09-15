import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render } from '@testing-library/react-native';
import React from 'react';

import { DriverGlassTopbar } from './DriverGlassTopbar';

describe('DriverGlassTopbar', () => {
  it('renders greeting, driver name and vehicle identity line', async () => {
    const screen = await render(
      <DriverGlassTopbar
        driverName="Trần Minh"
        greeting="Chào buổi sáng"
        vehiclePlate="51D-123.45"
        vehicleType="Xe tải 1.25T"
      />,
    );

    expect(screen.getByTestId('driver-glass-topbar')).toBeTruthy();
    expect(screen.getByText('Chào buổi sáng, Trần Minh')).toBeTruthy();
    expect(screen.getByText('51D-123.45 · Xe tải 1.25T')).toBeTruthy();

    await screen.unmount();
  });

  it('falls back to a placeholder when the driver has no vehicle on file', async () => {
    const screen = await render(<DriverGlassTopbar driverName={null} />);

    expect(screen.getByText(/Tài xế LEOPARD/)).toBeTruthy();
    expect(screen.getByText('Chưa cập nhật phương tiện')).toBeTruthy();

    await screen.unmount();
  });

  it('shows the pending offer badge and fires both top bar actions', async () => {
    const onOpenNotifications = jest.fn();
    const onOpenProfile = jest.fn();
    const screen = await render(
      <DriverGlassTopbar
        driverName="Trần Minh"
        onOpenNotifications={onOpenNotifications}
        onOpenProfile={onOpenProfile}
        pendingOfferCount={3}
      />,
    );

    expect(screen.getByText('3')).toBeTruthy();

    await fireEvent.press(screen.getByTestId('driver-topbar-notifications'));
    expect(onOpenNotifications).toHaveBeenCalledTimes(1);

    await fireEvent.press(screen.getByTestId('driver-topbar-profile'));
    expect(onOpenProfile).toHaveBeenCalledTimes(1);

    await screen.unmount();
  });

  it('hides the badge when there are no pending offers', async () => {
    const screen = await render(<DriverGlassTopbar onOpenNotifications={() => {}} />);

    expect(screen.queryByText('0')).toBeNull();

    await screen.unmount();
  });
});
