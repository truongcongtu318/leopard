import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import React from 'react';

import RegisterScreen from '../../app/(public)/driver-register';
import { httpClient } from '@leopard/mobile-core/src/api/http-client';
import { openDriverContractPdf } from '../features/contract/contract-pdf';
import { sessionStore } from '@leopard/mobile-core/src/auth/session-store';
import { pickDeviceImage } from '@leopard/mobile-core';

const mockReplace = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: mockReplace, back: jest.fn() }),
}));

jest.mock('@leopard/mobile-core/src/api/http-client', () => ({
  httpClient: { post: jest.fn(), postForm: jest.fn(), get: jest.fn() },
}));

jest.mock('@leopard/mobile-core/src/auth/session-store', () => ({
  sessionStore: { getAccessToken: jest.fn() },
}));

jest.mock('@leopard/mobile-core', () => ({
  ...jest.requireActual<typeof import('@leopard/mobile-core')>('@leopard/mobile-core'),
  pickDeviceImage: jest.fn(),
}));

jest.mock('../features/contract/contract-pdf', () => ({
  openDriverContractPdf: jest.fn(),
}));

const asset = {
  uri: 'file:///tmp/doc.jpg',
  name: 'doc.jpg',
  mimeType: 'image/jpeg',
  size: 1024,
};

const CONTRACT_PREVIEW = { version: 'v1', pdfUrl: '/driver/contract/pdf?version=v1' };

function mockHttpGet() {
  (httpClient.get as jest.Mock).mockImplementation((path: unknown) => {
    if (path === '/driver/contract') {
      return Promise.resolve(CONTRACT_PREVIEW as never);
    }
    if (path === '/driver/application') {
      return Promise.resolve({
        status: 'PENDING_APPROVAL',
        rejectionReason: null,
        contractVersion: null,
        contractSignedAt: null,
      } as never);
    }
    return Promise.reject(new Error(`unexpected path: ${String(path)}`));
  });
}

/**
 * Fills the driver fields (name/plate/GPLX) — enough for the contract step
 * to appear, since it does not wait on the KYC documents to render.
 *
 * `fireEvent.*` calls here are awaited: in this testing-library version
 * they return a promise, and leaving one unawaited leaks an open `act()`
 * scope that corrupts every later test's render in the same file.
 */
async function fillBasicInfo(screen: Awaited<ReturnType<typeof render>>) {
  await fireEvent.changeText(screen.getByLabelText('Họ và tên'), 'Nguyễn Văn A');
  await fireEvent.changeText(screen.getByLabelText('Biển số xe'), '59D-123.45');
  await fireEvent.changeText(screen.getByLabelText('Số GPLX'), '590123456789');
}

/**
 * Fills the driver fields and all three KYC documents — needed only by
 * tests that actually submit, since the CTA stays disabled without docs.
 */
async function fillFormAndDocs(screen: Awaited<ReturnType<typeof render>>) {
  await fillBasicInfo(screen);

  await fireEvent.press(screen.getByLabelText('Chọn ảnh Giấy phép lái xe (GPLX)'));
  await fireEvent.press(screen.getByLabelText('Chọn ảnh Cà-vẹt / Đăng ký xe'));
  await fireEvent.press(screen.getByLabelText('Chọn ảnh CCCD / CMND'));

  await waitFor(() => expect(screen.getAllByText('Đổi ảnh')).toHaveLength(3));
}

describe('RegisterScreen (Driver registration)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (sessionStore.getAccessToken as jest.Mock).mockReturnValue('access-token');
    (pickDeviceImage as jest.Mock).mockResolvedValue(asset as never);
    (openDriverContractPdf as jest.Mock).mockResolvedValue(undefined as never);
    mockHttpGet();
  });

  it('shows a login gate when the user is not authenticated', async () => {
    (sessionStore.getAccessToken as jest.Mock).mockReturnValue(null);

    const screen = await render(<RegisterScreen />);
    expect(screen.getByText('Cần đăng nhập trước')).toBeTruthy();
    await screen.unmount();
  });

  it('renders the driver form fields when authenticated', async () => {
    const screen = await render(<RegisterScreen />);
    await waitFor(() => expect(httpClient.get).toHaveBeenCalledWith('/driver/contract'));
    expect(screen.getByLabelText('Họ và tên')).toBeTruthy();
    expect(screen.getByLabelText('Biển số xe')).toBeTruthy();
    expect(screen.getByLabelText('Số GPLX')).toBeTruthy();
    expect(screen.getByText('Giấy phép lái xe (GPLX)')).toBeTruthy();
    expect(screen.getByText('CCCD / CMND')).toBeTruthy();
    await screen.unmount();
  });

  it('fetches the contract preview and shows an accessible "Xem hợp đồng" link once driver info is filled', async () => {
    const screen = await render(<RegisterScreen />);
    await fillBasicInfo(screen);

    const link = await screen.findByLabelText('Xem hợp đồng');
    expect(link).toBeTruthy();

    await fireEvent.press(link);
    await waitFor(() =>
      expect(openDriverContractPdf as jest.Mock).toHaveBeenCalledWith(
        CONTRACT_PREVIEW.pdfUrl,
        'access-token',
      ),
    );
    await screen.unmount();
  });

  it('shows an error and does not crash when opening the contract PDF fails', async () => {
    (openDriverContractPdf as jest.Mock).mockRejectedValue(new Error('boom') as never);

    const screen = await render(<RegisterScreen />);
    await fillBasicInfo(screen);

    const link = await screen.findByLabelText('Xem hợp đồng');
    await fireEvent.press(link);

    expect(
      await screen.findByText('Không thể mở hợp đồng, vui lòng thử lại sau'),
    ).toBeTruthy();
    await screen.unmount();
  });

  it('shows an error state and does not crash when GET /driver/contract fails', async () => {
    (httpClient.get as jest.Mock).mockImplementation((path: unknown) => {
      if (path === '/driver/contract') {
        return Promise.reject(new Error('network down'));
      }
      if (path === '/driver/application') {
        return Promise.resolve({
          status: 'PENDING_APPROVAL',
          rejectionReason: null,
          contractVersion: null,
          contractSignedAt: null,
        } as never);
      }
      return Promise.reject(new Error(`unexpected path: ${String(path)}`));
    });

    const screen = await render(<RegisterScreen />);
    await fillBasicInfo(screen);

    expect(
      await screen.findByText('Không tải được hợp đồng, vui lòng thử lại'),
    ).toBeTruthy();
    // No "Xem hợp đồng" link should render since the contract descriptor never loaded.
    expect(screen.queryByLabelText('Xem hợp đồng')).toBeNull();
    await screen.unmount();
  });

  it('keeps the submit CTA disabled until consent is checked and a signature is confirmed', async () => {
    const screen = await render(<RegisterScreen />);
    await fillFormAndDocs(screen);

    const submitBtn = await screen.findByLabelText('Gửi hồ sơ đăng ký');
    expect(submitBtn.props.accessibilityState.disabled).toBe(true);

    await fireEvent.press(submitBtn);
    expect(httpClient.post).not.toHaveBeenCalled();

    await fireEvent.press(screen.getByLabelText('Tôi đã đọc và đồng ý với hợp đồng tài xế'));

    // The typed signature pre-fills from the driver's name, so consent alone is enough.
    await waitFor(() => expect(submitBtn.props.accessibilityState.disabled).toBe(false));
    await screen.unmount();
  });

  it('disables submit when the confirmed signature is cleared even with consent given', async () => {
    const screen = await render(<RegisterScreen />);
    await fillFormAndDocs(screen);

    await fireEvent.press(screen.getByLabelText('Tôi đã đọc và đồng ý với hợp đồng tài xế'));
    await fireEvent.changeText(screen.getByLabelText('Chữ ký xác nhận'), '   ');

    const submitBtn = await screen.findByLabelText('Gửi hồ sơ đăng ký');
    expect(submitBtn.props.accessibilityState.disabled).toBe(true);
    await screen.unmount();
  });

  it('submits the application with contractAccepted + typed signature, then uploads each KYC document', async () => {
    (httpClient.post as jest.Mock).mockResolvedValue({
      contractVersion: 'v1',
      contractSignedAt: '2026-09-07T10:00:00.000Z',
    } as never);
    (httpClient.postForm as jest.Mock).mockResolvedValue({} as never);

    const screen = await render(<RegisterScreen />);
    await fillFormAndDocs(screen);

    await fireEvent.press(screen.getByLabelText('Tôi đã đọc và đồng ý với hợp đồng tài xế'));
    await fireEvent.press(screen.getByLabelText('Gửi hồ sơ đăng ký'));

    await waitFor(() => {
      expect(httpClient.post).toHaveBeenCalledWith('/driver/apply', {
        name: 'Nguyễn Văn A',
        vehicleType: 'VAN',
        licensePlate: '59D-123.45',
        licenseNumber: '590123456789',
        contractAccepted: true,
        signature: 'Nguyễn Văn A',
      });
      expect(httpClient.postForm).toHaveBeenCalledTimes(3);
      expect(httpClient.postForm).toHaveBeenCalledWith(
        '/driver/documents',
        expect.any(FormData),
      );
      expect(screen.getByTestId('register-success')).toBeTruthy();
    });

    // The signed contract version + time from the apply response show on the pending card.
    expect(screen.getByText(/Đã ký hợp đồng phiên bản v1 lúc/)).toBeTruthy();

    // The pending card lets the driver re-check their approval status.
    await fireEvent.press(screen.getByRole('button', { name: 'Kiểm tra lại' }));
    await waitFor(() =>
      expect(httpClient.get).toHaveBeenCalledWith('/driver/application'),
    );
    await screen.unmount();
  });

  it('surfaces an actionable message when the server rejects the contract (CONTRACT_NOT_ACCEPTED)', async () => {
    (httpClient.post as jest.Mock).mockRejectedValue({
      statusCode: 422,
      code: 'CONTRACT_NOT_ACCEPTED',
      message: 'Bạn cần đồng ý với hợp đồng tài xế trước khi đăng ký',
    } as never);

    const screen = await render(<RegisterScreen />);
    await fillFormAndDocs(screen);
    await fireEvent.press(screen.getByLabelText('Tôi đã đọc và đồng ý với hợp đồng tài xế'));
    await fireEvent.press(screen.getByLabelText('Gửi hồ sơ đăng ký'));

    expect(
      await screen.findByText('Bạn cần đồng ý với hợp đồng tài xế trước khi đăng ký'),
    ).toBeTruthy();
    expect(httpClient.postForm).not.toHaveBeenCalled();
    await screen.unmount();
  });

  it('surfaces an actionable message when the signature is rejected (SIGNATURE_INVALID)', async () => {
    (httpClient.post as jest.Mock).mockRejectedValue({
      statusCode: 422,
      code: 'SIGNATURE_INVALID',
      message: 'Chữ ký không hợp lệ',
    } as never);

    const screen = await render(<RegisterScreen />);
    await fillFormAndDocs(screen);
    await fireEvent.press(screen.getByLabelText('Tôi đã đọc và đồng ý với hợp đồng tài xế'));
    await fireEvent.press(screen.getByLabelText('Gửi hồ sơ đăng ký'));

    expect(await screen.findByText('Chữ ký không hợp lệ')).toBeTruthy();
    await screen.unmount();
  });

  it('shows the signed contract version and time on the pending/rejected screen from GET /driver/application', async () => {
    (httpClient.get as jest.Mock).mockImplementation((path: unknown) => {
      if (path === '/driver/contract') return Promise.resolve(CONTRACT_PREVIEW as never);
      if (path === '/driver/application') {
        return Promise.resolve({
          status: 'REJECTED',
          rejectionReason: 'Ảnh giấy tờ mờ',
          contractVersion: 'v1',
          contractSignedAt: '2026-09-06T08:30:00.000Z',
        } as never);
      }
      return Promise.reject(new Error('unexpected path'));
    });
    (httpClient.post as jest.Mock).mockResolvedValue({
      contractVersion: null,
      contractSignedAt: null,
    } as never);
    (httpClient.postForm as jest.Mock).mockResolvedValue({} as never);

    const screen = await render(<RegisterScreen />);
    await fillFormAndDocs(screen);
    await fireEvent.press(screen.getByLabelText('Tôi đã đọc và đồng ý với hợp đồng tài xế'));
    await fireEvent.press(screen.getByLabelText('Gửi hồ sơ đăng ký'));

    await waitFor(() => expect(screen.getByTestId('register-success')).toBeTruthy());

    await fireEvent.press(screen.getByRole('button', { name: 'Kiểm tra lại' }));

    expect(await screen.findByText('Hồ sơ bị từ chối')).toBeTruthy();
    expect(screen.getByText(/Đã ký hợp đồng phiên bản v1 lúc/)).toBeTruthy();
    await screen.unmount();
  });
});
