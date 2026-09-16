import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render } from '@testing-library/react-native';
import React from 'react';

import { NavigableMetricCard } from './NavigableMetricCard';

describe('NavigableMetricCard', () => {
  it('renders title, value and handles press', async () => {
    const onPress = jest.fn();
    const screen = await render(
      <NavigableMetricCard
        onPress={onPress}
        testID="metric-card"
        title="Cuốc xe đã hoàn tất"
        value="0 cuốc xe"
      />,
    );

    expect(screen.getByText('Cuốc xe đã hoàn tất')).toBeTruthy();
    expect(screen.getByText('0 cuốc xe')).toBeTruthy();
    expect(screen.getByTestId('metric-card')).toBeTruthy();

    await fireEvent.press(screen.getByRole('button'));
    expect(onPress).toHaveBeenCalledTimes(1);

    await screen.unmount();
  });

  it('renders static card without pressable wrapper when onPress is omitted', async () => {
    const screen = await render(
      <NavigableMetricCard
        testID="static-metric-card"
        title="Tỷ lệ giao thành công"
        value="98%"
      />,
    );

    expect(screen.getByText('Tỷ lệ giao thành công')).toBeTruthy();
    expect(screen.getByText('98%')).toBeTruthy();
    expect(screen.queryByRole('button')).toBeNull();

    await screen.unmount();
  });
});
