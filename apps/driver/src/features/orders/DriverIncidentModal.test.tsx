import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render } from '@testing-library/react-native';
import React from 'react';

import { DriverIncidentModal } from './DriverIncidentModal';

describe('DriverIncidentModal', () => {
  it('renders modal with incident reasons and closes on cancel', async () => {
    const onClose = jest.fn();
    const onSubmit = jest.fn<any>().mockResolvedValue(undefined);

    const screen = await render(
      <DriverIncidentModal
        onClose={onClose}
        onSubmit={onSubmit}
        orderReference="ORD-1234"
        visible={true}
      />,
    );

    expect(screen.getByText('Báo cáo sự cố chuyến đi')).toBeTruthy();
    expect(screen.getByText('Đơn hàng ORD-1234')).toBeTruthy();
    expect(screen.getByText('Phương tiện gặp sự cố / Hỏng xe / Tai nạn')).toBeTruthy();
    expect(screen.getByText('Người nhận từ chối nhận hàng / không nghe máy')).toBeTruthy();

    const closeBtn = screen.getByLabelText('Đóng và hủy báo cáo sự cố');
    await fireEvent.press(closeBtn);
    expect(onClose).toHaveBeenCalledTimes(1);

    await screen.unmount();
  });

  it('allows selecting a reason, entering a note, and submitting', async () => {
    const onClose = jest.fn();
    const onSubmit = jest.fn<any>().mockResolvedValue(undefined);

    const screen = await render(
      <DriverIncidentModal
        onClose={onClose}
        onSubmit={onSubmit}
        orderReference="ORD-1234"
        visible={true}
      />,
    );

    // Select "Người nhận từ chối nhận hàng" (RECIPIENT_REJECTED)
    const reasonOption = screen.getByTestId('incident-reason-RECIPIENT_REJECTED');
    await fireEvent.press(reasonOption);

    // Type note
    const input = screen.getByTestId('input-incident-note');
    await fireEvent.changeText(input, 'Khách hàng không nhận vì hàng trầy xước');

    // Submit
    const submitBtn = screen.getByTestId('btn-confirm-incident-report');
    await fireEvent.press(submitBtn);

    expect(onSubmit).toHaveBeenCalledWith({
      reason: 'RECIPIENT_REJECTED',
      note: 'Khách hàng không nhận vì hàng trầy xước',
    });

    await screen.unmount();
  });

  it('uses the contained modal surface on web with dialog role', async () => {
    const { Platform } = require('react-native');
    const originalOS = Platform.OS;
    Platform.OS = 'web';

    try {
      const screen = await render(
        <DriverIncidentModal
          onClose={jest.fn()}
          onSubmit={jest.fn<any>().mockResolvedValue(undefined)}
          orderReference="ORD-1234"
          visible={true}
        />,
      );

      const modalSurface = screen.getByTestId('driver-incident-modal');
      expect(modalSurface).toBeTruthy();
      expect(modalSurface.props.accessibilityViewIsModal).toBe(true);

      await screen.unmount();
    } finally {
      Platform.OS = originalOS;
    }
  });
});
