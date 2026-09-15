import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render } from '@testing-library/react-native';
import React from 'react';
import { Linking } from 'react-native';

import { DriverOrderDetailScreen } from './DriverOrderDetailScreen';
import { createDriverDetailFixture } from './fixtures';
import type { DriverAssignedDetailView } from './model';

describe('DriverOrderDetailScreen calling audit (D-06)', () => {
  it('calls customer telephone URL when a valid phone number is present', async () => {
    const openURLSpy = jest.spyOn(Linking, 'openURL').mockResolvedValue(true as any);

    const baseFixture = createDriverDetailFixture('D-DETAIL-ACCEPTED') as DriverAssignedDetailView;
    const view: DriverAssignedDetailView = {
      ...baseFixture,
      order: {
        ...baseFixture.order,
        customerContact: 'Thủ kho Nam (0987654321)',
      },
    };

    const screen = await render(<DriverOrderDetailScreen view={view} />);

    const callBtn = screen.getByLabelText('Gọi cho người nhận');
    await fireEvent.press(callBtn);

    expect(openURLSpy).toHaveBeenCalledWith('tel:0987654321');

    openURLSpy.mockRestore();
    await screen.unmount();
  });

  it('does NOT dial hardcoded hotline 19001234 when contact is invalid or missing', async () => {
    const openURLSpy = jest.spyOn(Linking, 'openURL').mockResolvedValue(true as any);

    const baseFixture = createDriverDetailFixture('D-DETAIL-ACCEPTED') as DriverAssignedDetailView;
    const view: DriverAssignedDetailView = {
      ...baseFixture,
      order: {
        ...baseFixture.order,
        customerContact: 'Chưa cập nhật thông tin người nhận',
      },
    };

    const screen = await render(<DriverOrderDetailScreen view={view} />);

    const callBtn = screen.getByLabelText('Gọi cho người nhận');
    await fireEvent.press(callBtn);

    expect(openURLSpy).not.toHaveBeenCalled();

    openURLSpy.mockRestore();
    await screen.unmount();
  });
});
