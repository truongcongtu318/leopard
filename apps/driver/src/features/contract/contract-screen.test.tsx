import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render } from '@testing-library/react-native';
import React from 'react';

const mockReplace = jest.fn();
const mockBack = jest.fn();
const mockOpenDriverContractPdf = jest.fn<(...args: unknown[]) => Promise<void>>();

jest.mock('expo-router', () => ({
  useRouter: () => ({
    replace: mockReplace,
    back: mockBack,
  }),
}));

jest.mock('./contract-pdf', () => ({
  openDriverContractPdf: (...args: unknown[]) => mockOpenDriverContractPdf(...args),
}));

import { sessionStore } from '@leopard/mobile-core';
import { DriverContractScreen } from './DriverContractScreen';

describe('DriverContractScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders contract header, legal terms, and initial signature requirement', async () => {
    const screen = await render(<DriverContractScreen />);

    // Header & Eyebrow
    expect(screen.getByText('LEOPARD · B2B PARTNERSHIP')).toBeTruthy();
    expect(screen.getByText('Hợp đồng đối tác số hóa')).toBeTruthy();

    // Legal Terms Viewer (Quy chế, Trách nhiệm bảo quản, Tỷ lệ 90/10)
    expect(screen.getByText('Quy chế đối tác tài xế LEOPARD')).toBeTruthy();
    expect(screen.getByText('Trách nhiệm bảo quản hàng hóa B2B')).toBeTruthy();
    expect(screen.getByText('Tỷ lệ phân chia doanh thu 90/10')).toBeTruthy();
    expect(screen.getByText('90% / 10%')).toBeTruthy();

    // Initial state: signature is required, complete button disabled
    expect(screen.getByText('Bắt buộc')).toBeTruthy();
    expect(screen.getByTestId('contract-signature-pad')).toBeTruthy();

    const completeBtn = screen.getByRole('button', {
      name: 'Vui lòng ký hợp đồng để kích hoạt tài xế',
    });
    expect(completeBtn).toBeTruthy();

    await screen.unmount();
  });

  it('allows signing the contract and enables activation button', async () => {
    const onComplete = jest.fn();
    const screen = await render(<DriverContractScreen onComplete={onComplete} />);

    // Tap signature pad
    const pad = screen.getByTestId('contract-signature-pad');
    await fireEvent.press(pad);

    // Signature preview shows up
    expect(screen.getByText('Nguyễn Văn Tuấn')).toBeTruthy();
    expect(screen.getByText(/Chữ ký điện tử đã được xác thực/)).toBeTruthy();
    expect(screen.getByText('Đã ký')).toBeTruthy();

    // Re-sign / Clear button appears
    const clearBtn = screen.getByTestId('contract-signature-clear');
    expect(clearBtn).toBeTruthy();

    // Complete contract button is now clickable
    const completeBtn = screen.getByRole('button', {
      name: 'Ký hợp đồng & Kích hoạt tài xế',
    });
    await fireEvent.press(completeBtn);
    expect(onComplete).toHaveBeenCalledTimes(1);

    await screen.unmount();
  });

  it('allows clearing and re-signing the contract', async () => {
    const screen = await render(<DriverContractScreen defaultSigned={true} />);

    expect(screen.getByText('Đã ký')).toBeTruthy();
    const clearBtn = screen.getByTestId('contract-signature-clear');
    await fireEvent.press(clearBtn);

    // After clearing, prompt returns and badge is required
    expect(screen.getByText('Bắt buộc')).toBeTruthy();
    expect(screen.getByText('KÝ TÊN VÀO KHUNG NÀY')).toBeTruthy();

    await screen.unmount();
  });

  it('navigates to /orders when completed without custom handler', async () => {
    const screen = await render(<DriverContractScreen defaultSigned={true} />);

    const completeBtn = screen.getByRole('button', {
      name: 'Ký hợp đồng & Kích hoạt tài xế',
    });
    await fireEvent.press(completeBtn);

    expect(mockReplace).toHaveBeenCalledWith('/orders');
    await screen.unmount();
  });

  it('triggers PDF download when pressing download PDF button', async () => {
    const onDownloadPdf = jest.fn();
    const screen = await render(<DriverContractScreen onDownloadPdf={onDownloadPdf} />);

    const downloadBtn = screen.getByTestId('btn-download-contract-pdf');
    await fireEvent.press(downloadBtn);

    expect(onDownloadPdf).toHaveBeenCalledTimes(1);
    expect(mockOpenDriverContractPdf).not.toHaveBeenCalled();
    await screen.unmount();
  });

  it('calls openDriverContractPdf with sessionStore token when downloading without custom handler', async () => {
    jest.spyOn(sessionStore, 'getAccessToken').mockReturnValue('mock-jwt-token');
    mockOpenDriverContractPdf.mockResolvedValue(undefined);

    const screen = await render(<DriverContractScreen />);
    const downloadBtn = screen.getByTestId('btn-download-contract-pdf');
    await fireEvent.press(downloadBtn);

    expect(mockOpenDriverContractPdf).toHaveBeenCalledWith(
      '/driver/contract/pdf?version=v1',
      'mock-jwt-token',
    );
    await screen.unmount();
  });
});
