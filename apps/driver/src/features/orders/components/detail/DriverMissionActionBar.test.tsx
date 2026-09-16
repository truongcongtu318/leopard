import { fireEvent, render } from '@testing-library/react-native';
import React from 'react';
import { Linking } from 'react-native';
import { DriverMissionActionBar } from './DriverMissionActionBar';

describe('DriverMissionActionBar', () => {
  it('exposes call, navigate, and incident controls with stable testIDs', async () => {
    const onOpenIncidentModal = jest.fn();
    const openURLSpy = jest.spyOn(Linking, 'openURL').mockResolvedValue(true as any);

    const screen = await render(
      <DriverMissionActionBar
        customerContact="Kho Tổng Nam (0912345678)"
        isMissionActive
        isTerminal={false}
        legTitle="ĐẾN ĐIỂM LẤY HÀNG"
        navigationTarget={{ lat: 10.79, lng: 106.65, label: 'Kho' }}
        onOpenIncidentModal={onOpenIncidentModal}
        taskButtonComponent={<></>}
      />,
    );

    expect(screen.getByLabelText('Gọi cho người nhận')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('btn-navigate-active-leg'));
    expect(openURLSpy).toHaveBeenCalled();

    await fireEvent.press(screen.getByTestId('btn-open-incident-modal'));
    await fireEvent.press(screen.getByTestId('btn-report-incident'));
    expect(onOpenIncidentModal).toHaveBeenCalledTimes(2);

    openURLSpy.mockRestore();
    await screen.unmount();
  });

  it('shows the terminal fallback button when isTerminal is true and hides call/nav/incident', async () => {
    const screen = await render(
      <DriverMissionActionBar
        isMissionActive={false}
        isTerminal
        legTitle="HOÀN TẤT"
        navigationTarget={null}
      />,
    );
    expect(screen.getByTestId('btn-terminal-home')).toBeTruthy();
    expect(screen.queryByTestId('btn-navigate-active-leg')).toBeNull();
    expect(screen.queryByTestId('btn-open-incident-modal')).toBeNull();
    await screen.unmount();
  });
});
