import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import React from 'react';

import RegisterScreen from '../../app/(public)/register';
import { httpClient } from '../api/http-client';
import { sessionStore } from './session-store';
import { pickDeviceImage } from '../media/device-image-picker';

const mockReplace = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: mockReplace, back: jest.fn() }),
}));

jest.mock('../api/http-client', () => ({
  httpClient: { post: jest.fn(), postForm: jest.fn(), get: jest.fn() },
}));

jest.mock('./session-store', () => ({
  sessionStore: { getAccessToken: jest.fn() },
}));

jest.mock('../media/device-image-picker', () => ({
  pickDeviceImage: jest.fn(),
}));

const asset = {
  uri: 'file:///tmp/doc.jpg',
  name: 'doc.jpg',
  mimeType: 'image/jpeg',
  size: 1024,
};

describe('RegisterScreen (Driver registration)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (sessionStore.getAccessToken as jest.Mock).mockReturnValue('access-token');
    (pickDeviceImage as jest.Mock).mockResolvedValue(asset as never);
    (httpClient.get as jest.Mock).mockResolvedValue({
      status: 'PENDING_APPROVAL',
      rejectionReason: null,
    } as never);
  });

  it('shows a login gate when the user is not authenticated', async () => {
    (sessionStore.getAccessToken as jest.Mock).mockReturnValue(null);

    const screen = await render(<RegisterScreen />);
    expect(screen.getByText('Cần đăng nhập trước')).toBeTruthy();
    await screen.unmount();
  });

  it('renders the driver form fields when authenticated', async () => {
    const screen = await render(<RegisterScreen />);
    expect(screen.getByLabelText('Họ và tên')).toBeTruthy();
    expect(screen.getByLabelText('Biển số xe')).toBeTruthy();
    expect(screen.getByLabelText('Số GPLX')).toBeTruthy();
    expect(screen.getByText('Giấy phép lái xe (GPLX)')).toBeTruthy();
    expect(screen.getByText('CCCD / CMND')).toBeTruthy();
    await screen.unmount();
  });

  it('submits the application then uploads each KYC document', async () => {
    (httpClient.post as jest.Mock).mockResolvedValue({} as never);
    (httpClient.postForm as jest.Mock).mockResolvedValue({} as never);

    const screen = await render(<RegisterScreen />);

    fireEvent.changeText(screen.getByLabelText('Họ và tên'), 'Nguyễn Văn A');
    fireEvent.changeText(screen.getByLabelText('Biển số xe'), '59D-123.45');
    fireEvent.changeText(screen.getByLabelText('Số GPLX'), '590123456789');

    fireEvent.press(screen.getByLabelText('Chọn ảnh Giấy phép lái xe (GPLX)'));
    fireEvent.press(screen.getByLabelText('Chọn ảnh Cà-vẹt / Đăng ký xe'));
    fireEvent.press(screen.getByLabelText('Chọn ảnh CCCD / CMND'));

    await waitFor(() =>
      expect(pickDeviceImage as jest.Mock).toHaveBeenCalledTimes(3),
    );

    fireEvent.press(screen.getByLabelText('Gửi hồ sơ đăng ký'));

    await waitFor(() => {
      expect(httpClient.post).toHaveBeenCalledWith('/driver/apply', {
        name: 'Nguyễn Văn A',
        vehicleType: 'VAN',
        licensePlate: '59D-123.45',
        licenseNumber: '590123456789',
      });
      expect(httpClient.postForm).toHaveBeenCalledTimes(3);
      expect(httpClient.postForm).toHaveBeenCalledWith(
        '/driver/documents',
        expect.any(FormData),
      );
      expect(screen.getByTestId('register-success')).toBeTruthy();
    });

    // The pending card lets the driver re-check their approval status.
    fireEvent.press(screen.getByRole('button', { name: 'Kiểm tra lại' }));
    await waitFor(() =>
      expect(httpClient.get).toHaveBeenCalledWith('/driver/application'),
    );
    await screen.unmount();
  });
});
