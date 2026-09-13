import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render } from '@testing-library/react-native';
import React from 'react';

import { DriverOrderDetailScreen } from './DriverOrderDetailScreen';
import { createDriverDetailFixture } from './fixtures';
import type { DriverAssignedDetailView } from './model';

describe('DriverOrderDetailScreen incident reporting audit (D-08)', () => {
  it('displays incident reporting trigger on active orders and invokes callback', async () => {
    const onOpenIncidentModal = jest.fn();
    const baseFixture = createDriverDetailFixture('D-DETAIL-ACCEPTED') as DriverAssignedDetailView;

    const screen = await render(
      <DriverOrderDetailScreen
        onOpenIncidentModal={onOpenIncidentModal}
        view={baseFixture}
      />,
    );

    // Both the sticky round button and banner trigger incident reporting
    const incidentBtn = screen.getByTestId('btn-open-incident-modal');
    expect(incidentBtn).toBeTruthy();

    await fireEvent.press(incidentBtn);
    expect(onOpenIncidentModal).toHaveBeenCalledTimes(1);

    const bannerBtn = screen.getByTestId('btn-report-incident');
    expect(bannerBtn).toBeTruthy();

    await fireEvent.press(bannerBtn);
    expect(onOpenIncidentModal).toHaveBeenCalledTimes(2);

    await screen.unmount();
  });

  it('hides incident trigger when order is terminal or completed', async () => {
    const onOpenIncidentModal = jest.fn();
    const baseFixture = createDriverDetailFixture('D-DETAIL-TERMINAL-DELIVERED') as DriverAssignedDetailView;

    const screen = await render(
      <DriverOrderDetailScreen
        onOpenIncidentModal={onOpenIncidentModal}
        view={baseFixture}
      />,
    );

    expect(screen.queryByTestId('btn-open-incident-modal')).toBeNull();
    expect(screen.queryByTestId('btn-report-incident')).toBeNull();

    await screen.unmount();
  });
});
