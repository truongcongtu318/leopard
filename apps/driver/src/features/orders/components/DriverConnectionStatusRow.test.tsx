import { describe, expect, it } from '@jest/globals';
import { render } from '@testing-library/react-native';
import React from 'react';

import { DriverConnectionStatusRow } from './DriverConnectionStatusRow';

describe('DriverConnectionStatusRow', () => {
  it('tells the driver dispatch cannot see them while offline', async () => {
    const screen = await render(<DriverConnectionStatusRow isOnline={false} />);

    expect(screen.getByTestId('driver-connection-status')).toBeTruthy();
    expect(screen.getByText('Bạn đang tắt kết nối.')).toBeTruthy();

    await screen.unmount();
  });

  it('confirms receiving state and renders the optional subtitle', async () => {
    const screen = await render(
      <DriverConnectionStatusRow isOnline subtitle="51D-123.45 · Xe tải 1.25T" />,
    );

    expect(screen.getByText('Bạn đang bật kết nối.')).toBeTruthy();
    expect(screen.getByText('51D-123.45 · Xe tải 1.25T')).toBeTruthy();

    await screen.unmount();
  });

  it('omits the subtitle line when none is provided', async () => {
    const screen = await render(<DriverConnectionStatusRow isOnline />);

    expect(screen.queryByText('51D-123.45 · Xe tải 1.25T')).toBeNull();

    await screen.unmount();
  });
});
