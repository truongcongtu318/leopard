import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render } from '@testing-library/react-native';
import React from 'react';

import { DriverQuickActionGrid } from './DriverQuickActionGrid';

describe('DriverQuickActionGrid', () => {
  it('renders the 4 Grab-style shortcuts and routes each press', async () => {
    const onOpenVehicle = jest.fn();
    const onOpenTrips = jest.fn();
    const onOpenWallet = jest.fn();
    const onOpenSettings = jest.fn();

    const screen = await render(
      <DriverQuickActionGrid
        onOpenSettings={onOpenSettings}
        onOpenTrips={onOpenTrips}
        onOpenVehicle={onOpenVehicle}
        onOpenWallet={onOpenWallet}
      />,
    );

    expect(screen.getByTestId('driver-quick-action-grid')).toBeTruthy();

    await fireEvent.press(screen.getByTestId('quick-action-vehicle'));
    expect(onOpenVehicle).toHaveBeenCalledTimes(1);

    await fireEvent.press(screen.getByTestId('quick-action-trips'));
    expect(onOpenTrips).toHaveBeenCalledTimes(1);

    await fireEvent.press(screen.getByTestId('quick-action-wallet'));
    expect(onOpenWallet).toHaveBeenCalledTimes(1);

    await fireEvent.press(screen.getByTestId('quick-action-settings'));
    expect(onOpenSettings).toHaveBeenCalledTimes(1);

    await screen.unmount();
  });

  it('exposes accessible labels for every shortcut', async () => {
    const screen = await render(
      <DriverQuickActionGrid
        onOpenSettings={() => {}}
        onOpenTrips={() => {}}
        onOpenVehicle={() => {}}
        onOpenWallet={() => {}}
      />,
    );

    expect(screen.getByLabelText('Thông tin xe vận chuyển')).toBeTruthy();
    expect(screen.getByLabelText('Lịch sử chuyến xe')).toBeTruthy();
    expect(screen.getByLabelText('Ví tài xế')).toBeTruthy();
    expect(screen.getByLabelText('Thiết lập nhận đơn và hỗ trợ')).toBeTruthy();

    await screen.unmount();
  });
});
