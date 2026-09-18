import { describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ProofCaptureSheet } from './ProofCaptureSheet';
import { MultiStopProgressHeader } from './MultiStopProgressHeader';

describe('ProofCaptureSheet', () => {
  const baseProps = {
    capturedAt: new Date(2026, 7, 15, 14, 30, 15),
    onCancel: jest.fn(),
    onConfirm: jest.fn(),
    onRetake: jest.fn(),
    photoUri: 'file:///var/mobile/proof.jpg',
    title: 'Ảnh kiểm hàng tại điểm lấy',
    watermarkCoords: '21.02800° N, 105.83450° E',
  };

  it('previews the real captured photo rather than a placeholder frame', async () => {
    const screen = await render(<ProofCaptureSheet {...baseProps} />);

    expect(screen.getByTestId('proof-capture-photo').props.source).toEqual({
      uri: 'file:///var/mobile/proof.jpg',
    });
  });

  it('shows the honest GPS and time watermark over the photo', async () => {
    const screen = await render(<ProofCaptureSheet {...baseProps} />);

    expect(screen.getByText('21.02800° N, 105.83450° E')).toBeTruthy();
    expect(screen.getByText('14:30:15 15/08/2026')).toBeTruthy();
  });

  it('says the position is unavailable instead of inventing coordinates', async () => {
    const screen = await render(
      <ProofCaptureSheet {...baseProps} watermarkCoords={null} />
    );

    expect(screen.getByText('Chưa có vị trí GPS')).toBeTruthy();
  });

  it('confirms, retakes and cancels through distinct actions', async () => {
    const onConfirm = jest.fn();
    const onRetake = jest.fn();
    const onCancel = jest.fn();
    const screen = await render(
      <ProofCaptureSheet
        {...baseProps}
        onCancel={onCancel}
        onConfirm={onConfirm}
        onRetake={onRetake}
      />
    );

    await fireEvent.press(screen.getByTestId('btn-confirm-proof'));
    expect(onConfirm).toHaveBeenCalledTimes(1);

    await fireEvent.press(screen.getByTestId('btn-retake-proof'));
    expect(onRetake).toHaveBeenCalledTimes(1);

    await fireEvent.press(screen.getByTestId('btn-cancel-proof-sheet'));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('blocks every action while the upload is in flight', async () => {
    const onConfirm = jest.fn();
    const onRetake = jest.fn();
    const screen = await render(
      <ProofCaptureSheet {...baseProps} isUploading onConfirm={onConfirm} onRetake={onRetake} />
    );

    await fireEvent.press(screen.getByTestId('btn-confirm-proof'));
    await fireEvent.press(screen.getByTestId('btn-retake-proof'));

    expect(onConfirm).not.toHaveBeenCalled();
    expect(onRetake).not.toHaveBeenCalled();
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
