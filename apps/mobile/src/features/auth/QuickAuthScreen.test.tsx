import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render } from '@testing-library/react-native';

import { QuickAuthScreen } from './QuickAuthScreen';

describe('QuickAuthScreen', () => {
  it('renders auth fields, toggles password visibility, and submits credentials', async () => {
    const onLogin = jest.fn();
    const onGoogleLogin = jest.fn();
    const onGuestContinue = jest.fn();

    const screen = await render(
      <QuickAuthScreen
        onGoogleLogin={onGoogleLogin}
        onGuestContinue={onGuestContinue}
        onLogin={onLogin}
      />,
    );

    expect(screen.getByText('Đăng nhập LEOPARD')).toBeTruthy();

    const idInput = screen.getByLabelText('Số điện thoại hoặc Email');
    const passInput = screen.getByLabelText('Mật khẩu');

    await fireEvent.changeText(idInput, '0901234567');
    await fireEvent.changeText(passInput, 'secret123');

    const submitBtn = screen.getByLabelText('Đăng nhập');
    await fireEvent.press(submitBtn);

    expect(onLogin).toHaveBeenCalledWith({
      identifier: '0901234567',
      pass: 'secret123',
    });

    const googleBtn = screen.getByLabelText('Đăng nhập với Google');
    await fireEvent.press(googleBtn);
    expect(onGoogleLogin).toHaveBeenCalledTimes(1);

    const guestBtn = screen.getByLabelText('Tra cứu nhanh không cần tài khoản');
    await fireEvent.press(guestBtn);
    expect(onGuestContinue).toHaveBeenCalledTimes(1);

    await screen.unmount();
  });
});
