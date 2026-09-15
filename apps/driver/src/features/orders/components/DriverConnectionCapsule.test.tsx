import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render } from '@testing-library/react-native';
import React from 'react';

import { DriverConnectionCapsule } from './DriverConnectionCapsule';

describe('DriverConnectionCapsule', () => {
  it('renders the offline call to action and toggles availability on press', async () => {
    const onToggle = jest.fn();
    const screen = await render(<DriverConnectionCapsule isOnline={false} onToggle={onToggle} />);

    expect(screen.getByTestId('driver-connection-capsule')).toBeTruthy();
    expect(screen.getByText('BẬT KẾT NỐI')).toBeTruthy();
    expect(screen.getByText('Bạn đang ngoại tuyến')).toBeTruthy();

    await fireEvent.press(screen.getByTestId('driver-connection-toggle'));
    expect(onToggle).toHaveBeenCalledTimes(1);

    await screen.unmount();
  });

  it('renders the online state when availability is ONLINE', async () => {
    const screen = await render(<DriverConnectionCapsule isOnline onToggle={() => {}} />);

    expect(screen.getByText('ĐANG KẾT NỐI')).toBeTruthy();
    expect(screen.getByText('Bạn đang trực tuyến')).toBeTruthy();

    const toggle = screen.getByTestId('driver-connection-toggle');
    expect(toggle.props.accessibilityState).toMatchObject({ selected: true });

    await screen.unmount();
  });

  it('shows a spinner and blocks presses while the availability command is pending', async () => {
    const onToggle = jest.fn();
    const screen = await render(
      <DriverConnectionCapsule isOnline={false} isPending onToggle={onToggle} />,
    );

    expect(screen.getByTestId('driver-connection-spinner')).toBeTruthy();

    await fireEvent.press(screen.getByTestId('driver-connection-toggle'));
    expect(onToggle).not.toHaveBeenCalled();

    await screen.unmount();
  });

  it('blocks presses when disabled', async () => {
    const onToggle = jest.fn();
    const screen = await render(
      <DriverConnectionCapsule disabled isOnline={false} onToggle={onToggle} />,
    );

    expect(screen.getByTestId('driver-connection-toggle').props.accessibilityState).toMatchObject({
      disabled: true,
    });

    await fireEvent.press(screen.getByTestId('driver-connection-toggle'));
    expect(onToggle).not.toHaveBeenCalled();

    await screen.unmount();
  });
});
