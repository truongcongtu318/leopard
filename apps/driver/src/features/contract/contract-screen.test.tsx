import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render } from '@testing-library/react-native';
import { Linking } from 'react-native';
import React from 'react';

const mockBack = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({
    back: mockBack,
  }),
}));

import { DriverContractScreen } from './DriverContractScreen';

const signedStatus = {
  signed: true,
  version: 'v1',
  signedByName: 'Nguyễn Văn A',
  signedAt: '2026-08-01T09:30:00.000Z',
  pdfUrl: 'https://storage.example.com/contracts/signed.pdf?token=abc',
  signatureUrl: null,
};

describe('DriverContractScreen', () => {
  it('shows a loading state while the contract status query is pending', async () => {
    const screen = await render(
      <DriverContractScreen isError={false} isLoading={true} onRetry={jest.fn()} status={null} />,
    );
    expect(screen.queryByTestId('contract-signed-badge')).toBeNull();
    await screen.unmount();
  });

  it('shows a retry action when the contract status query fails', async () => {
    const onRetry = jest.fn();
    const screen = await render(
      <DriverContractScreen isError={true} isLoading={false} onRetry={onRetry} status={null} />,
    );
    expect(screen.getByText('Thử lại')).toBeTruthy();
    await screen.unmount();
  });

  it('shows an empty state when the driver has no signed contract on file', async () => {
    const screen = await render(
      <DriverContractScreen isError={false} isLoading={false} onRetry={jest.fn()} status={{ signed: false }} />,
    );
    expect(screen.getByText('Chưa có hợp đồng')).toBeTruthy();
    expect(screen.queryByTestId('contract-signed-badge')).toBeNull();
    await screen.unmount();
  });

  it('renders the real signed contract version, signer, and signed date', async () => {
    const screen = await render(
      <DriverContractScreen isError={false} isLoading={false} onRetry={jest.fn()} status={signedStatus} />,
    );
    expect(screen.getByTestId('contract-signed-badge')).toBeTruthy();
    expect(screen.getByText('v1')).toBeTruthy();
    expect(screen.getByText('Nguyễn Văn A')).toBeTruthy();
    await screen.unmount();
  });

  it('opens the real signed PDF url when pressing the download button', async () => {
    const openURLSpy = jest.spyOn(Linking, 'openURL').mockResolvedValue(true as never);
    const screen = await render(
      <DriverContractScreen isError={false} isLoading={false} onRetry={jest.fn()} status={signedStatus} />,
    );

    const downloadBtn = screen.getByTestId('btn-download-contract-pdf');
    await fireEvent.press(downloadBtn);

    expect(openURLSpy).toHaveBeenCalledWith(signedStatus.pdfUrl);
    await screen.unmount();
  });
});
