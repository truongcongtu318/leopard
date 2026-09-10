import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import React from 'react';

import { OnboardingScreen } from './OnboardingScreen';

describe('OnboardingScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders branding, initial slide content, and allows skipping', async () => {
    const onGetStarted = jest.fn();
    const onDriverRegister = jest.fn();

    const screen = await render(
      <OnboardingScreen
        onDriverRegister={onDriverRegister}
        onGetStarted={onGetStarted}
      />,
    );

    // Brand Name & First slide content
    expect(screen.getByText('LEOPARD')).toBeTruthy();
    expect(screen.getByText('Vận chuyển hỏa tốc')).toBeTruthy();
    expect(
      screen.getByText('Giao hàng đường dài & Đa dạng loại xe'),
    ).toBeTruthy();

    // Skip button directly invokes onGetStarted
    const skipBtn = screen.getByLabelText('Bỏ qua');
    await fireEvent.press(skipBtn);
    expect(onGetStarted).toHaveBeenCalledTimes(1);

    await screen.unmount();
  });

  it('advances slides and allows skipping to login directly', async () => {
    const onGetStarted = jest.fn();
    const screen = await render(<OnboardingScreen onGetStarted={onGetStarted} />);
    const skipBtn = screen.getByText('Bỏ qua ➔');
    await fireEvent.press(skipBtn);
    expect(onGetStarted).toHaveBeenCalledTimes(1);

    await screen.unmount();
  });

  it('navigates through slides using next button and finishes on last slide', async () => {
    const onGetStarted = jest.fn();

    const screen = await render(
      <OnboardingScreen onGetStarted={onGetStarted} />,
    );

    // Slide 1 -> Slide 2
    const nextBtn = screen.getByLabelText('Trang tiếp theo');
    await fireEvent.press(nextBtn);

    expect(screen.getByText('Bốc dỡ tận tâm')).toBeTruthy();
    expect(
      screen.getByText('Đội ngũ chuyên nghiệp & Hỗ trợ bốc xếp'),
    ).toBeTruthy();

    // Slide 2 -> Slide 3
    await fireEvent.press(screen.getByLabelText('Trang tiếp theo'));

    expect(screen.getByText('Toàn quốc 63 tỉnh thành')).toBeTruthy();
    expect(
      screen.getByText('Vận tải liên tỉnh & Bảo hiểm 100%'),
    ).toBeTruthy();

    // On final slide, CTA label becomes "Bắt đầu ngay" and finishes
    const finishBtn = screen.getByLabelText('Bắt đầu ngay');
    await fireEvent.press(finishBtn);
    expect(onGetStarted).toHaveBeenCalledTimes(1);

    await screen.unmount();
  });

  it('allows jumping directly to a slide via pagination dots', async () => {
    const onGetStarted = jest.fn();

    const screen = await render(
      <OnboardingScreen onGetStarted={onGetStarted} />,
    );

    // Jump directly to slide 3
    const dot3 = screen.getByLabelText('Chuyển tới trang 3');
    await fireEvent.press(dot3);

    expect(screen.getByText('Toàn quốc 63 tỉnh thành')).toBeTruthy();

    await screen.unmount();
  });

  it('handles driver registration link', async () => {
    const onGetStarted = jest.fn();
    const onDriverRegister = jest.fn();

    const screen = await render(
      <OnboardingScreen
        onDriverRegister={onDriverRegister}
        onGetStarted={onGetStarted}
      />,
    );

    const driverBtn = screen.getByLabelText('Đăng ký đối tác tài xế');
    await fireEvent.press(driverBtn);
    expect(onDriverRegister).toHaveBeenCalledTimes(1);

    await screen.unmount();
  });

  it('handles guest exploration link if provided', async () => {
    const onGetStarted = jest.fn();
    const onExploreGuest = jest.fn();

    const screen = await render(
      <OnboardingScreen
        onExploreGuest={onExploreGuest}
        onGetStarted={onGetStarted}
      />,
    );

    const skipBtn = screen.getByText('Bỏ qua ➔');
    await fireEvent.press(skipBtn);
    expect(onGetStarted).toHaveBeenCalledTimes(1);

    await screen.unmount();
  });
});
