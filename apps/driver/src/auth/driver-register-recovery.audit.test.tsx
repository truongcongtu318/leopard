import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import React from 'react';

import RegisterScreen from '../../app/(public)/driver-register';
import { httpClient, sessionStore, captureDeviceImage } from '@leopard/mobile-core';

jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: jest.fn(), back: jest.fn() }),
}));
jest.mock('@leopard/mobile-core/src/api/http-client', () => ({
  httpClient: { post: jest.fn(), postForm: jest.fn(), get: jest.fn() },
}));
jest.mock('@leopard/mobile-core/src/auth/session-store', () => ({
  sessionStore: { getAccessToken: jest.fn() },
}));
jest.mock('@leopard/mobile-core', () => ({
  ...jest.requireActual<typeof import('@leopard/mobile-core')>('@leopard/mobile-core'),
  captureDeviceImage: jest.fn(),
}));
jest.mock('../features/contract/contract-pdf', () => ({
  openDriverContractPdf: jest.fn(),
}));

const applied = { contractVersion: 'v1', contractSignedAt: '2026-09-11T00:00:00.000Z' };
const uploadError = 'Mất kết nối khi tải giấy đăng ký xe';

async function reachDocumentStep(screen: Awaited<ReturnType<typeof render>>) {
  await fireEvent.changeText(screen.getByLabelText('Họ và tên'), 'Tài xế kiểm thử');
  await fireEvent.press(screen.getByLabelText('Tiếp tục sang bước phương tiện'));
  await fireEvent.changeText(screen.getByLabelText('Biển số xe'), '59D-000.01');
  await fireEvent.changeText(screen.getByLabelText('Số GPLX'), '000000000001');
  await fireEvent.press(screen.getByLabelText('Tiếp tục sang chụp giấy tờ'));
}

async function submitFilledForm(screen: Awaited<ReturnType<typeof render>>) {
  await reachDocumentStep(screen);
  for (const label of ['Giấy phép lái xe (GPLX)', 'Cà-vẹt / Đăng ký xe', 'CCCD / CMND']) {
    await fireEvent.press(screen.getByLabelText(`Chụp ảnh ${label}`));
  }
  await waitFor(() => expect(screen.getAllByText('Chụp lại')).toHaveLength(3));
  await fireEvent.press(screen.getByLabelText('Tiếp tục xem hợp đồng'));
  await fireEvent.press(screen.getByLabelText('Tôi đã đọc và đồng ý với hợp đồng tài xế'));
  await fireEvent.press(screen.getByLabelText('Gửi hồ sơ đăng ký'));
}

describe('Driver registration partial-upload recovery audit', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    (sessionStore.getAccessToken as jest.Mock).mockReturnValue('audit-token');
    (captureDeviceImage as jest.Mock).mockResolvedValue({
      uri: 'file:///tmp/audit-document.jpg', name: 'audit-document.jpg',
      mimeType: 'image/jpeg', size: 1024,
    } as never);
    (httpClient.get as jest.Mock).mockResolvedValue({
      version: 'v1', pdfUrl: '/driver/contract/pdf?version=v1',
    } as never);
    // Mirror the BE contract: after successful apply the user is PENDING_APPROVAL,
    // so another apply is rejected (DriverApplicationService.loadApplicableUser).
    (httpClient.post as jest.Mock)
      .mockResolvedValueOnce(applied as never)
      .mockRejectedValue({
        statusCode: 409, code: 'DRIVER_APPLICATION_PENDING',
        message: 'Hồ sơ tài xế đang chờ duyệt',
      } as never);
    (httpClient.postForm as jest.Mock)
      .mockResolvedValueOnce({} as never)
      .mockRejectedValueOnce(new Error(uploadError) as never)
      .mockResolvedValue({} as never);
  });

  it('shows an actionable camera error and keeps the document incomplete', async () => {
    (captureDeviceImage as jest.Mock).mockRejectedValueOnce(new Error('permission denied') as never);
    const screen = await render(<RegisterScreen />);

    try {
      await reachDocumentStep(screen);
      await fireEvent.press(screen.getByLabelText('Chụp ảnh Giấy phép lái xe (GPLX)'));

      expect(
        await screen.findByText('Không thể mở camera. Vui lòng cấp quyền máy ảnh rồi thử lại.'),
      ).toBeTruthy();
      expect(screen.queryByText('Đã chụp')).toBeNull();
    } finally {
      await screen.unmount();
    }
  });

  it('reaches a recoverable form after apply succeeds and the second document upload fails', async () => {
    const screen = await render(<RegisterScreen />);
    try {
      await submitFilledForm(screen);
      expect(await screen.findByText(uploadError)).toBeTruthy();
      expect(httpClient.post).toHaveBeenCalledTimes(1);
      expect(httpClient.postForm).toHaveBeenCalledTimes(2);
      expect(screen.queryByTestId('register-success')).toBeNull();
      expect(screen.getByLabelText('Gửi hồ sơ đăng ký').props.accessibilityState.disabled).toBe(false);
    } finally {
      await screen.unmount();
    }
  });

  it('resumes remaining documents without reapplying when the driver retries', async () => {
    const screen = await render(<RegisterScreen />);
    try {
      await submitFilledForm(screen);
      expect(await screen.findByText(uploadError)).toBeTruthy();
      await fireEvent.press(screen.getByLabelText('Gửi hồ sơ đăng ký'));
      // Desired UX: use the committed application and resume its outstanding KYC.
      expect(httpClient.post).toHaveBeenCalledTimes(1);
      await waitFor(() => expect(httpClient.postForm).toHaveBeenCalledTimes(4));
      expect(screen.getByTestId('register-success')).toBeTruthy();
    } finally {
      await screen.unmount();
    }
  });
});
