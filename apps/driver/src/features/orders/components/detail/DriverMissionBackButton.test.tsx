import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render } from '@testing-library/react-native';
import React from 'react';
import { DriverMissionBackButton } from './DriverMissionBackButton';

describe('DriverMissionBackButton', () => {
  it('calls onBack when pressed', async () => {
    const onBack = jest.fn();
    const screen = await render(<DriverMissionBackButton onBack={onBack} />);
    await fireEvent.press(screen.getByLabelText('Quay lại'));
    expect(onBack).toHaveBeenCalledTimes(1);
    await screen.unmount();
  });

  it('renders nothing when onBack is not provided', async () => {
    const screen = await render(<DriverMissionBackButton />);
    expect(screen.queryByLabelText('Quay lại')).toBeNull();
    await screen.unmount();
  });
});
