import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { render, fireEvent, waitFor } from '@testing-library/react-native';

import CustomerRegisterScreen from '../../app/(public)/customer-register';
import { httpClient } from '../api/http-client';
import { ApiError } from '../api/api-error';
import { sendPhoneOtp, resetRecaptcha } from './firebase-auth';
import { sessionStore } from './session-store';

jest.mock('../api/http-client', () => ({
  httpClient: { get: jest.fn(), patch: jest.fn(), post: jest.fn() },
}));

jest.mock('./firebase-auth', () => ({
  sendPhoneOtp: jest.fn(),
  resetRecaptcha: jest.fn(),
}));

// Mock the session store so setSession does not touch expo-secure-store in tests.
jest.mock('./session-store', () => ({
  sessionStore: {
    setSession: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
    getAccessToken: jest.fn(() => 'acc'),
    getRefreshToken: jest.fn<() => Promise<string | null>>().mockResolvedValue('ref'),
  },
}));

const mockReplace = jest.fn();
const mockPush = jest.fn();
const mockBack = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: mockReplace, push: mockPush, back: mockBack, canGoBack: () => true }),
}));

describe('CustomerRegisterScreen', () => {
  jest.setTimeout(15000);
  const mockConfirm = jest.fn<() => Promise<string>>();

  beforeEach(() => {
    jest.clearAllMocks();
    (sessionStore.getAccessToken as any).mockReturnValue('acc');
    mockConfirm.mockResolvedValue('goog-otp-idtoken');
    (sendPhoneOtp as any).mockResolvedValue({ confirm: mockConfirm });
    (httpClient.get as any).mockResolvedValue({
      id: 'u1',
      phone: '+84900000001',
      email: null,
      name: null,
      role: 'CUSTOMER',
      status: 'ACTIVE',
      profileComplete: false,
    });
    (httpClient.patch as any).mockResolvedValue({ role: 'CUSTOMER', profileComplete: true });
    (httpClient.post as any).mockResolvedValue({ phone: '+84900000001' });
  });

  it('keeps submit disabled until name, email and required consents are provided', async () => {
    const screen = await render(<CustomerRegisterScreen />);
    await waitFor(() => expect(screen.getByText('+84900000001')).toBeTruthy());

    const submit = screen.getByTestId('cr-submit');
    expect(submit.props.accessibilityState.disabled).toBe(true);

    await fireEvent.changeText(screen.getByTestId('cr-name'), 'Nguyễn Văn An');
    await fireEvent.changeText(screen.getByTestId('cr-email'), 'an@example.com');
    await fireEvent.press(screen.getByTestId('cr-consent-terms'));
    await fireEvent.press(screen.getByTestId('cr-consent-service'));

    await waitFor(() => {
      expect(screen.getByTestId('cr-submit').props.accessibilityState.disabled).toBe(false);
    });
    await screen.unmount();
  });

  it('submits PATCH /users/me and navigates home with optional consents', async () => {
    const screen = await render(<CustomerRegisterScreen />);
    await waitFor(() => expect(screen.getByText('+84900000001')).toBeTruthy());

    await fireEvent.changeText(screen.getByTestId('cr-name'), 'An');
    await fireEvent.changeText(screen.getByTestId('cr-email'), 'an@example.com');
    await fireEvent.press(screen.getByTestId('cr-consent-terms'));
    await fireEvent.press(screen.getByTestId('cr-consent-service'));
    await fireEvent.press(screen.getByTestId('cr-consent-marketing'));
    await fireEvent.press(screen.getByTestId('cr-consent-third'));
    await fireEvent.press(screen.getByTestId('cr-submit'));

    await waitFor(() =>
      expect(httpClient.patch).toHaveBeenCalledWith(
        '/users/me',
        expect.objectContaining({
          name: 'An',
          email: 'an@example.com',
          consentTerms: true,
          consentService: true,
          consentMarketing: true,
          consentThirdParty: true,
        }),
      ),
    );
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/(public)/customer-address'));
    await screen.unmount();
  });

  it('prefills name and email when returned from /me', async () => {
    (httpClient.get as any).mockResolvedValue({
      id: 'u2',
      phone: '+84900000002',
      email: 'existing@example.com',
      name: 'Nguyễn Văn B',
      role: 'CUSTOMER',
      status: 'ACTIVE',
      profileComplete: false,
    });

    const screen = await render(<CustomerRegisterScreen />);
    await waitFor(() => expect(screen.getByText('+84900000002')).toBeTruthy());

    expect(screen.getByTestId('cr-name').props.value).toBe('Nguyễn Văn B');
    expect(screen.getByTestId('cr-email').props.value).toBe('existing@example.com');
    await screen.unmount();
  });

  it('displays error message on 401 response', async () => {
    (httpClient.patch as any).mockRejectedValue({ statusCode: 401 });

    const screen = await render(<CustomerRegisterScreen />);
    await waitFor(() => expect(screen.getByText('+84900000001')).toBeTruthy());

    await fireEvent.changeText(screen.getByTestId('cr-name'), 'An');
    await fireEvent.changeText(screen.getByTestId('cr-email'), 'an@example.com');
    await fireEvent.press(screen.getByTestId('cr-consent-terms'));
    await fireEvent.press(screen.getByTestId('cr-consent-service'));
    await fireEvent.press(screen.getByTestId('cr-submit'));

    await waitFor(() => {
      expect(screen.getByTestId('cr-error')).toBeTruthy();
      expect(screen.getByText('Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại')).toBeTruthy();
    });
    await screen.unmount();
  });

  it('displays error message on ApiError 400 response', async () => {
    (httpClient.patch as any).mockRejectedValue(
      new ApiError(400, 'BAD_REQUEST', 'Email không hợp lệ'),
    );

    const screen = await render(<CustomerRegisterScreen />);
    await waitFor(() => expect(screen.getByText('+84900000001')).toBeTruthy());

    await fireEvent.changeText(screen.getByTestId('cr-name'), 'An');
    await fireEvent.changeText(screen.getByTestId('cr-email'), 'an@example.com');
    await fireEvent.press(screen.getByTestId('cr-consent-terms'));
    await fireEvent.press(screen.getByTestId('cr-consent-service'));
    await fireEvent.press(screen.getByTestId('cr-submit'));

    await waitFor(() => {
      expect(screen.getByTestId('cr-error')).toBeTruthy();
      expect(screen.getByText('Email không hợp lệ')).toBeTruthy();
    });
    await screen.unmount();
  });

  it('navigates to driver-register when driver registration link is pressed', async () => {
    const screen = await render(<CustomerRegisterScreen />);
    await waitFor(() => expect(screen.getByText('+84900000001')).toBeTruthy());

    await fireEvent.press(screen.getByText('Đăng ký làm tài xế đối tác →'));
    expect(mockPush).toHaveBeenCalledWith('/(public)/driver-register');
    await screen.unmount();
  });

  it('navigates back when the back button is pressed', async () => {
    const screen = await render(<CustomerRegisterScreen />);
    await fireEvent.press(screen.getByTestId('cr-back-btn'));
    expect(mockBack).toHaveBeenCalled();
    await screen.unmount();
  });

  it('requires phone verification for a Google user before submit is enabled', async () => {
    (httpClient.get as any).mockResolvedValue({
      id: 'u1',
      phone: null,
      email: 'an@example.com',
      name: 'An',
      role: 'CUSTOMER',
      status: 'ACTIVE',
      profileComplete: false,
    });

    const screen = await render(<CustomerRegisterScreen />);
    await waitFor(() => expect(httpClient.get).toHaveBeenCalled());

    // Name and email are prefilled from /me; consent checkboxes toggled
    await fireEvent.press(screen.getByTestId('cr-consent-terms'));
    await fireEvent.press(screen.getByTestId('cr-consent-service'));

    // Submit is disabled because phone is not yet verified
    expect(screen.getByTestId('cr-submit').props.accessibilityState.disabled).toBe(true);

    // Enter phone, request OTP, enter OTP, verify
    await fireEvent.changeText(screen.getByTestId('cr-phone-input'), '0900000001');
    await fireEvent.press(screen.getByTestId('cr-send-otp'));

    await waitFor(() => expect(screen.getByTestId('cr-otp-input')).toBeTruthy());
    await fireEvent.changeText(screen.getByTestId('cr-otp-input'), '123456');
    await fireEvent.press(screen.getByTestId('cr-verify-otp'));

    await waitFor(() => {
      expect(httpClient.post).toHaveBeenCalledWith('/auth/phone/link', {
        idToken: 'goog-otp-idtoken',
      });
      expect(screen.getByTestId('cr-submit').props.accessibilityState.disabled).toBe(false);
    });

    // Now submit works
    await fireEvent.press(screen.getByTestId('cr-submit'));
    await waitFor(() => {
      expect(httpClient.patch).toHaveBeenCalledWith(
        '/users/me',
        expect.objectContaining({
          name: 'An',
          email: 'an@example.com',
          consentTerms: true,
          consentService: true,
        }),
      );
      expect(mockReplace).toHaveBeenCalledWith('/(public)/customer-address');
    });

    await screen.unmount();
  });

  it('authenticates directly via /auth/firebase when verifying phone as a new unauthenticated user', async () => {
    (sessionStore.getAccessToken as any).mockReturnValue(null);
    (httpClient.post as any).mockResolvedValue({
      user: {
        id: 'u-new',
        phone: '+84900000001',
        email: null,
        name: null,
        role: 'CUSTOMER',
        status: 'ACTIVE',
        profileComplete: false,
      },
      session: {
        accessToken: 'new-acc',
        accessTokenExpiresAt: '2026-09-03T10:00:00Z',
        refreshToken: 'new-ref',
        refreshTokenExpiresAt: '2026-09-10T10:00:00Z',
      },
    });

    const screen = await render(<CustomerRegisterScreen />);

    // Since unauthenticated, GET /me is not called
    expect(httpClient.get).not.toHaveBeenCalled();

    // Enter phone, request OTP
    await fireEvent.changeText(screen.getByTestId('cr-phone-input'), '0900000001');
    await fireEvent.press(screen.getByTestId('cr-send-otp'));

    await waitFor(() => expect(screen.getByTestId('cr-otp-input')).toBeTruthy());
    await fireEvent.changeText(screen.getByTestId('cr-otp-input'), '123456');
    await fireEvent.press(screen.getByTestId('cr-verify-otp'));

    await waitFor(() => {
      // Must call /auth/firebase, NOT /auth/phone/link
      expect(httpClient.post).toHaveBeenCalledWith('/auth/firebase', {
        idToken: 'goog-otp-idtoken',
      });
      expect(sessionStore.setSession).toHaveBeenCalledWith('new-acc', 'new-ref', 'CUSTOMER');
      expect(screen.getByText('Đã xác thực')).toBeTruthy();
    });

    await screen.unmount();
  });

  it('disables send OTP button until a valid VN phone number is entered', async () => {
    (sessionStore.getAccessToken as any).mockReturnValue(null);
    const screen = await render(<CustomerRegisterScreen />);

    const sendBtn = screen.getByTestId('cr-send-otp');
    // Initially empty -> disabled
    expect(sendBtn.props.accessibilityState.disabled).toBe(true);

    // Incomplete phone number -> still disabled
    await fireEvent.changeText(screen.getByTestId('cr-phone-input'), '090');
    expect(sendBtn.props.accessibilityState.disabled).toBe(true);

    // Valid 10-digit VN phone number -> enabled
    await fireEvent.changeText(screen.getByTestId('cr-phone-input'), '0900000001');
    expect(sendBtn.props.accessibilityState.disabled).toBe(false);

    // Too long / invalid -> disabled again
    await fireEvent.changeText(screen.getByTestId('cr-phone-input'), '09000000019999');
    expect(sendBtn.props.accessibilityState.disabled).toBe(true);

    await screen.unmount();
  });
});
