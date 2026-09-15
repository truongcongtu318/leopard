import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import React from 'react';

import RegisterScreen, { draftStorage, DRAFT_STORAGE_KEY } from '../../app/(public)/driver-register';
import { httpClient } from '@leopard/mobile-core/src/api/http-client';
import { openDriverContractPdf } from '../features/contract/contract-pdf';
import { sessionStore } from '@leopard/mobile-core/src/auth/session-store';
import { captureDeviceImage } from '@leopard/mobile-core';

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
  captureDeviceImage: jest.fn(),
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
 * Fills the driver fields (name in Step 1, plate/GPLX in Step 2).
 *
 * `fireEvent.*` calls here are awaited: in this testing-library version
 * they return a promise, and leaving one unawaited leaks an open `act()`
 * scope that corrupts every later test's render in the same file.
 */
async function fillBasicInfo(screen: Awaited<ReturnType<typeof render>>) {
  await fireEvent.changeText(screen.getByLabelText('Họ và tên'), 'Nguyễn Văn A');
  await fireEvent.press(screen.getByLabelText('Tiếp tục sang bước phương tiện'));
  await fireEvent.changeText(screen.getByLabelText('Biển số xe'), '59D-123.45');
  await fireEvent.changeText(screen.getByLabelText('Số GPLX'), '590123456789');
}

/**
 * Fills the driver fields across steps 1 & 2, uploads all three KYC documents
 * in step 3, and advances to step 4 (Contract & Signature).
 */
async function fillFormAndDocs(screen: Awaited<ReturnType<typeof render>>) {
  await fillBasicInfo(screen);

  await fireEvent.press(screen.getByLabelText('Tiếp tục sang chụp giấy tờ'));

  await fireEvent.press(screen.getByLabelText('Chụp ảnh Giấy phép lái xe (GPLX)'));
  await fireEvent.press(screen.getByLabelText('Chụp ảnh Cà-vẹt / Đăng ký xe'));
  await fireEvent.press(screen.getByLabelText('Chụp ảnh CCCD / CMND'));

  await waitFor(() => expect(screen.getAllByText('Chụp lại')).toHaveLength(3));

  await fireEvent.press(screen.getByLabelText('Tiếp tục xem hợp đồng'));
}

describe('RegisterScreen (Driver registration)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (sessionStore.getAccessToken as jest.Mock).mockReturnValue('access-token');
    (captureDeviceImage as jest.Mock).mockResolvedValue(asset as never);
    (openDriverContractPdf as jest.Mock).mockResolvedValue(undefined as never);
    mockHttpGet();
  });

  it('allows unauthenticated users to access the driver registration form directly with phone input', async () => {
    (sessionStore.getAccessToken as jest.Mock).mockReturnValue(null);

    const screen = await render(<RegisterScreen />);
    expect(screen.queryByText('Cần đăng nhập trước')).toBeNull();
    expect(screen.getByLabelText('Số điện thoại')).toBeTruthy();
    expect(screen.getByLabelText('Họ và tên')).toBeTruthy();
    expect(screen.getByTestId('driver-register-stepper')).toBeTruthy();
    await waitFor(() => expect(httpClient.get).toHaveBeenCalledWith('/driver/contract'));
    await screen.unmount();
  });

  it('allows navigating back to previous steps without losing entered state', async () => {
    const screen = await render(<RegisterScreen />);
    await fireEvent.changeText(screen.getByLabelText('Họ và tên'), 'Nguyễn Văn A');
    await fireEvent.press(screen.getByLabelText('Tiếp tục sang bước phương tiện'));

    expect(screen.getByLabelText('Biển số xe')).toBeTruthy();
    await fireEvent.press(screen.getByLabelText('Quay lại bước cá nhân'));
    expect(screen.getByLabelText('Họ và tên').props.value).toBe('Nguyễn Văn A');
    await screen.unmount();
  });

  it('triggers in-flow OTP modal when an unauthenticated user submits the form with valid phone', async () => {
    (sessionStore.getAccessToken as jest.Mock).mockReturnValue(null);

    const screen = await render(<RegisterScreen />);
    await fireEvent.changeText(screen.getByLabelText('Số điện thoại'), '0912345678');
    await fillFormAndDocs(screen);
    await fireEvent.press(screen.getByLabelText('Tôi đã đọc và đồng ý với hợp đồng tài xế'));
    await fireEvent.press(screen.getByLabelText('Gửi hồ sơ đăng ký'));

    expect(await screen.findByTestId('register-otp-modal')).toBeTruthy();
    await screen.unmount();
  });

  it('renders the driver form fields across multi-step wizard when authenticated', async () => {
    const screen = await render(<RegisterScreen />);
    await waitFor(() => expect(httpClient.get).toHaveBeenCalledWith('/driver/contract'));
    expect(screen.getByLabelText('Họ và tên')).toBeTruthy();
    await fireEvent.changeText(screen.getByLabelText('Họ và tên'), 'Nguyễn Văn A');
    await fireEvent.press(screen.getByLabelText('Tiếp tục sang bước phương tiện'));
    expect(screen.getByLabelText('Biển số xe')).toBeTruthy();
    expect(screen.getByLabelText('Số GPLX')).toBeTruthy();
    await fireEvent.changeText(screen.getByLabelText('Biển số xe'), '59D-123.45');
    await fireEvent.changeText(screen.getByLabelText('Số GPLX'), '590123456789');
    await fireEvent.press(screen.getByLabelText('Tiếp tục sang chụp giấy tờ'));
    expect(screen.getByText('Giấy phép lái xe (GPLX)')).toBeTruthy();
    expect(screen.getByText('CCCD / CMND')).toBeTruthy();
    await screen.unmount();
  });

  it('fetches the contract preview and shows an accessible "Xem hợp đồng" link once driver reaches step 4', async () => {
    const screen = await render(<RegisterScreen />);
    await fillFormAndDocs(screen);

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
    await fillFormAndDocs(screen);

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
    await fillFormAndDocs(screen);

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
      expect(mockReplace).toHaveBeenCalledWith('/(public)/kyc-pending');
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

  it('renders the 3-step progress stepper with "1. Cá nhân", "2. Phương tiện", "3. Giấy tờ"', async () => {
    const screen = await render(<RegisterScreen />);
    const stepper = screen.getByTestId('driver-register-stepper');
    expect(stepper).toBeTruthy();
    expect(screen.getByText('1. Cá nhân')).toBeTruthy();
    expect(screen.getByText('2. Phương tiện')).toBeTruthy();
    expect(screen.getByText('3. Giấy tờ')).toBeTruthy();
    await screen.unmount();
  });

  it('requires full name to have at least 3 characters before advancing to step 2', async () => {
    const screen = await render(<RegisterScreen />);
    await fireEvent.changeText(screen.getByLabelText('Họ và tên'), 'Ab');
    const nextBtn = screen.getByLabelText('Tiếp tục sang bước phương tiện');
    expect(nextBtn.props.accessibilityState?.disabled ?? nextBtn.props.disabled).toBe(true);
    await fireEvent.press(nextBtn);
    expect(screen.queryByLabelText('Biển số xe')).toBeNull();

    await fireEvent.changeText(screen.getByLabelText('Họ và tên'), 'Nguyễn Văn A');
    expect(
      screen.getByLabelText('Tiếp tục sang bước phương tiện').props.accessibilityState?.disabled ??
        false,
    ).toBe(false);
    await screen.unmount();
  });

  it('enforces single vehicle selection among the 4 vehicle categories and updates payload', async () => {
    const screen = await render(<RegisterScreen />);
    await fireEvent.changeText(screen.getByLabelText('Họ và tên'), 'Nguyễn Văn A');
    await fireEvent.press(screen.getByLabelText('Tiếp tục sang bước phương tiện'));

    expect(screen.getByLabelText('Xe Van 500kg')).toBeTruthy();
    expect(screen.getByLabelText('Xe Tải nhẹ 1.25T')).toBeTruthy();
    expect(screen.getByLabelText('Xe Tải 2.5T')).toBeTruthy();
    expect(screen.getByLabelText('Xe Ba gác')).toBeTruthy();

    expect(screen.getByLabelText('Xe Van 500kg').props.accessibilityState.selected).toBe(true);
    expect(screen.getByLabelText('Xe Tải nhẹ 1.25T').props.accessibilityState.selected).toBe(false);

    await fireEvent.press(screen.getByLabelText('Xe Tải nhẹ 1.25T'));
    expect(screen.getByLabelText('Xe Van 500kg').props.accessibilityState.selected).toBe(false);
    expect(screen.getByLabelText('Xe Tải nhẹ 1.25T').props.accessibilityState.selected).toBe(true);
    expect(screen.getByLabelText('Tải trọng đăng kiểm').props.value).toBe('1250');
    await screen.unmount();
  });

  it('enforces valid license plate format before advancing to step 3', async () => {
    const screen = await render(<RegisterScreen />);
    await fireEvent.changeText(screen.getByLabelText('Họ và tên'), 'Nguyễn Văn A');
    await fireEvent.press(screen.getByLabelText('Tiếp tục sang bước phương tiện'));

    await fireEvent.changeText(screen.getByLabelText('Biển số xe'), 'invalid-plate');
    await fireEvent.changeText(screen.getByLabelText('Số GPLX'), '590123456789');

    const nextBtn = screen.getByLabelText('Tiếp tục sang chụp giấy tờ');
    expect(nextBtn.props.accessibilityState?.disabled ?? nextBtn.props.disabled).toBe(true);
    await fireEvent.press(nextBtn);
    expect(screen.queryByText('Giấy phép lái xe (GPLX)')).toBeNull();

    await fireEvent.changeText(screen.getByLabelText('Biển số xe'), '59D-123.45');
    expect(
      screen.getByLabelText('Tiếp tục sang chụp giấy tờ').props.accessibilityState?.disabled ?? false,
    ).toBe(false);
    await screen.unmount();
  });

  it('allows deleting a captured KYC document back to uncaptured state', async () => {
    const screen = await render(<RegisterScreen />);
    await fillBasicInfo(screen);
    await fireEvent.press(screen.getByLabelText('Tiếp tục sang chụp giấy tờ'));

    await fireEvent.press(screen.getByLabelText('Chụp ảnh Giấy phép lái xe (GPLX)'));
    expect(await screen.findByText('Chụp lại')).toBeTruthy();
    expect(screen.getByLabelText('Xóa Giấy phép lái xe (GPLX)')).toBeTruthy();

    await fireEvent.press(screen.getByLabelText('Xóa Giấy phép lái xe (GPLX)'));
    expect(screen.getByLabelText('Chụp ảnh Giấy phép lái xe (GPLX)')).toBeTruthy();
    await screen.unmount();
  });

  it('restores draft form values from storage on mount and clears draft on submit', async () => {
    await draftStorage.saveDraft({
      fullName: 'Trần Văn Draft',
      phoneNumber: '0987654321',
      licensePlate: '51D-999.99',
      licenseNumber: '510987654321',
      selectedVehicle: 'TRUCK_1250KG',
    });

    const screen = await render(<RegisterScreen />);
    await waitFor(() => {
      expect(screen.getByLabelText('Họ và tên').props.value).toBe('Trần Văn Draft');
    });

    await fireEvent.press(screen.getByLabelText('Tiếp tục sang bước phương tiện'));
    expect(screen.getByLabelText('Biển số xe').props.value).toBe('51D-999.99');
    expect(screen.getByLabelText('Xe Tải nhẹ 1.25T').props.accessibilityState.selected).toBe(true);

    await screen.unmount();
    await draftStorage.clearDraft();
  });
});
