import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render } from '@testing-library/react-native';
import React from 'react';

import { DriverQuickActionGrid } from './DriverQuickActionGrid';

describe('DriverQuickActionGrid', () => {
  it('renders the 4 Grab-style shortcuts and routes each press', async () => {
    const onOpenVehicle = jest.fn();
    const onTriggerSos = jest.fn();
    const onOpenWallet = jest.fn();
    const onOpenSettings = jest.fn();

    const screen = await render(
      <DriverQuickActionGrid
        onOpenSettings={onOpenSettings}
        onOpenVehicle={onOpenVehicle}
        onOpenWallet={onOpenWallet}
        onTriggerSos={onTriggerSos}
      />,
    );

    expect(screen.getByTestId('driver-quick-action-grid')).toBeTruthy();

    await fireEvent.press(screen.getByTestId('quick-action-vehicle'));
    expect(onOpenVehicle).toHaveBeenCalledTimes(1);

    await fireEvent.press(screen.getByTestId('quick-action-sos'));
    expect(onTriggerSos).toHaveBeenCalledTimes(1);

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
        onOpenVehicle={() => {}}
        onOpenWallet={() => {}}
        onTriggerSos={() => {}}
      />,
    );

    expect(screen.getByLabelText('Thông tin xe vận chuyển')).toBeTruthy();
    expect(screen.getByLabelText('Gọi cứu hộ khẩn cấp SOS')).toBeTruthy();
    expect(screen.getByLabelText('Ví tài xế')).toBeTruthy();
    expect(screen.getByLabelText('Thiết lập bán kính nhận đơn')).toBeTruthy();

    await screen.unmount();
  });
});
