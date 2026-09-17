import { describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { PickupVerificationView } from './PickupVerificationView';
import { MultiStopProgressHeader } from './MultiStopProgressHeader';

describe('PickupVerificationView (State 6)', () => {
  it('disables CTA button until at least 1 photo is captured', async () => {
    const onConfirm = jest.fn();
    const screenNoPhoto = await render(
      <PickupVerificationView
        photos={[]}
        onCapturePhoto={jest.fn()}
        onConfirmPickup={onConfirm}
      />
    );
    const cta = screenNoPhoto.getByTestId('btn-confirm-pickup');
    await fireEvent.press(cta);
    expect(onConfirm).not.toHaveBeenCalled();

    const screenWithPhoto = await render(
      <PickupVerificationView
        photos={['file://proof.jpg']}
        onCapturePhoto={jest.fn()}
        onConfirmPickup={onConfirm}
      />
    );
    const activeCta = screenWithPhoto.getByTestId('btn-confirm-pickup');
    await fireEvent.press(activeCta);
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onConfirm).toHaveBeenCalledWith(
      expect.objectContaining({
        photos: ['file://proof.jpg'],
        packageCount: 24,
      })
    );
  });

  it('increments and decrements package count', async () => {
    const onConfirm = jest.fn();
    const screen = await render(
      <PickupVerificationView
        initialPackageCount={10}
        photos={['file://proof.jpg']}
        onCapturePhoto={jest.fn()}
        onConfirmPickup={onConfirm}
      />
    );
    await fireEvent.press(screen.getByTestId('btn-increment-pkg'));
    expect(screen.getByTestId('counter-value-text').props.children).toBe(11);
    await fireEvent.press(screen.getByTestId('btn-decrement-pkg'));
    expect(screen.getByTestId('counter-value-text').props.children).toBe(10);
  });
});

describe('MultiStopProgressHeader (State 7)', () => {
  it('renders multi-stop chips with checkmark for completed, active highlight for current', async () => {
    const stops = [
      { id: '1', title: 'Điểm lấy', status: 'completed' as const },
      { id: '2', title: 'Điểm 1 (Cầu Giấy)', status: 'active' as const },
      { id: '3', title: 'Điểm 2 (Nam Từ Liêm)', status: 'pending' as const },
    ];
    const screen = await render(<MultiStopProgressHeader stops={stops} />);
    expect(screen.getByText(/✓ Điểm lấy/)).toBeTruthy();
    expect(screen.getByText(/● Điểm 1 \(Cầu Giấy\)/)).toBeTruthy();
    expect(screen.getByText(/○ Điểm 2 \(Nam Từ Liêm\)/)).toBeTruthy();
  });
});
