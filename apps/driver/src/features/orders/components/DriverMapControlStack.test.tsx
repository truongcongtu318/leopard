import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render } from '@testing-library/react-native';
import React from 'react';

import { DriverMapControlStack } from './DriverMapControlStack';

describe('DriverMapControlStack', () => {
  it('recenters the map and opens radius settings', async () => {
    const onRecenter = jest.fn();
    const onOpenRadiusSettings = jest.fn();

    const screen = await render(
      <DriverMapControlStack
        onOpenRadiusSettings={onOpenRadiusSettings}
        onRecenter={onRecenter}
      />,
    );

    expect(screen.getByTestId('driver-map-control-stack')).toBeTruthy();

    await fireEvent.press(screen.getByTestId('driver-map-recenter'));
    expect(onRecenter).toHaveBeenCalledTimes(1);

    await fireEvent.press(screen.getByTestId('driver-map-radius'));
    expect(onOpenRadiusSettings).toHaveBeenCalledTimes(1);

    await screen.unmount();
  });

  it('shows the busy state and hides the refresh action when no handler is given', async () => {
    const screen = await render(
      <DriverMapControlStack
        isLocating
        onOpenRadiusSettings={() => {}}
        onRecenter={() => {}}
      />,
    );

    expect(screen.getByTestId('driver-map-recenter').props.accessibilityState).toMatchObject({
      busy: true,
    });
    expect(screen.getByLabelText('Đang xác định vị trí của bạn')).toBeTruthy();
    expect(screen.queryByTestId('driver-map-refresh')).toBeNull();

    await screen.unmount();
  });

  it('exposes a refresh action when a retry handler is provided', async () => {
    const onRefreshOffers = jest.fn();
    const screen = await render(
      <DriverMapControlStack
        onOpenRadiusSettings={() => {}}
        onRecenter={() => {}}
        onRefreshOffers={onRefreshOffers}
      />,
    );

    await fireEvent.press(screen.getByTestId('driver-map-refresh'));
    expect(onRefreshOffers).toHaveBeenCalledTimes(1);

    await screen.unmount();
  });
});
