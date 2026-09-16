import { fireEvent, render } from '@testing-library/react-native';
import React from 'react';
import { DriverMissionExtras } from './DriverMissionExtras';

describe('DriverMissionExtras', () => {
  const baseProps = {
    cargoSummary: '20 bao xi măng',
    cargoWeightKg: 1000,
    contactRoleLabel: 'Người nhận',
    customerContact: '0987654321',
    history: [],
    status: 'PICKING_UP',
    vehicleLabel: 'Xe tải 1.25T',
  };

  it('hides cargo details until the toggle is pressed', async () => {
    const screen = await render(<DriverMissionExtras {...baseProps} />);
    expect(screen.queryByText('20 bao xi măng')).toBeNull();

    await fireEvent.press(screen.getByTestId('btn-toggle-mission-extras'));
    expect(screen.getByText('20 bao xi măng')).toBeTruthy();
    await screen.unmount();
  });
});
