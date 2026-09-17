import { describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { DeliveryVerificationView } from './DeliveryVerificationView';

describe('DeliveryVerificationView (States 8 & 9)', () => {
  it('supports one-tap "Thu đủ số tiền" and completes COD delivery with photo (State 8)', async () => {
    const onComplete = jest.fn();
    const screen = await render(
      <DeliveryVerificationView
        type="COD"
        expectedAmount={520000}
        photos={['file://pod.jpg']}
        onCapturePhoto={jest.fn()}
        onCompleteDelivery={onComplete}
      />
    );
    expect(screen.getByTestId('cod-banner-card')).toBeTruthy();
    expect(screen.getByText(/520\.000 ₫/)).toBeTruthy();

    const quickBtn = screen.getByTestId('btn-quick-exact-amount');
    await fireEvent.press(quickBtn);

    const cta = screen.getByTestId('btn-confirm-delivery');
    await fireEvent.press(cta);

    expect(onComplete).toHaveBeenCalledWith(
      expect.objectContaining({
        collectedAmount: 520000,
        photos: ['file://pod.jpg'],
      })
    );
  });

  it('shows mismatch notice when amount differs from expected COD (State 8)', async () => {
    const screen = await render(
      <DeliveryVerificationView
        type="COD"
        expectedAmount={520000}
        photos={['file://pod.jpg']}
        onCapturePhoto={jest.fn()}
        onCompleteDelivery={jest.fn()}
      />
    );
    const input = screen.getByTestId('input-collected-amount');
    await fireEvent.changeText(input, '500000');
    expect(screen.getByTestId('mismatch-notice')).toBeTruthy();
  });

  it('requires reason and photo proof for delivery failure branch (State 9)', async () => {
    const onFail = jest.fn();
    const screenNoPhoto = await render(
      <DeliveryVerificationView
        type="FAILURE"
        photos={[]}
        onCapturePhoto={jest.fn()}
        onReportFailure={onFail}
        onCompleteDelivery={jest.fn()}
      />
    );
    const failBtnDisabled = screenNoPhoto.getByTestId('btn-confirm-failure');
    await fireEvent.press(failBtnDisabled);
    expect(onFail).not.toHaveBeenCalled();

    const screenWithPhoto = await render(
      <DeliveryVerificationView
        type="FAILURE"
        photos={['file://closed-gate.jpg']}
        onCapturePhoto={jest.fn()}
        onReportFailure={onFail}
        onCompleteDelivery={jest.fn()}
      />
    );
    const failBtnActive = screenWithPhoto.getByTestId('btn-confirm-failure');
    await fireEvent.press(failBtnActive);
    expect(onFail).toHaveBeenCalledWith(
      expect.objectContaining({
        photos: ['file://closed-gate.jpg'],
        reason: expect.stringContaining('Không liên lạc được'),
      })
    );
  });
});
