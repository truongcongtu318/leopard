import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, waitFor } from '@testing-library/react-native';

import { OnboardingScreen } from './OnboardingScreen';

describe('OnboardingScreen', () => {
  it('renders branding, tagline, and handles primary & secondary CTAs', async () => {
    const onGetStarted = jest.fn();
    const onDriverRegister = jest.fn();

    const screen = await render(
      <OnboardingScreen
        onDriverRegister={onDriverRegister}
        onGetStarted={onGetStarted}
      />,
    );

    // Brand Name & Tagline
    expect(screen.getByText('Leo')).toBeTruthy();
    expect(screen.getByText('pard')).toBeTruthy();
    expect(
      screen.getByText(
        'Vận chuyển hàng hóa & vật liệu thông minh',
      ),
    ).toBeTruthy();
    expect(
      screen.getByText(
        'Điều phối tức thì · Định vị GPS realtime · Tối ưu chi phí cho SME & Công trình',
      ),
    ).toBeTruthy();

    // Primary CTA — fires after the truck's launch-off exit animation.
    const startBtn = screen.getByLabelText('Bắt đầu ngay');
    await fireEvent.press(startBtn);
    await waitFor(() => expect(onGetStarted).toHaveBeenCalledTimes(1));

    // Driver register CTA
    const driverBtn = screen.getByLabelText('Đăng ký đối tác tài xế');
    await fireEvent.press(driverBtn);
    expect(onDriverRegister).toHaveBeenCalledTimes(1);

    await screen.unmount();
  });
});


