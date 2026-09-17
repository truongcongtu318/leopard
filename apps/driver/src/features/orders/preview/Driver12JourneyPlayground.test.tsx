import { describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { TripCompletedSummaryView } from '../components/detail/TripCompletedSummaryView';
import { Driver12JourneyPlayground } from './Driver12JourneyPlayground';

describe('TripCompletedSummaryView (State 10)', () => {
  it('renders total earnings hero, fee breakdown, and 5-star rating', async () => {
    const onHome = jest.fn();
    const screen = await render(
      <TripCompletedSummaryView
        orderCode="#LP-8921"
        totalEarnings={245000}
        deliveryFare={210000}
        codCollected={520000}
        onGoHome={onHome}
      />
    );
    expect(screen.getByText('HOÀN THÀNH CHUYẾN ĐI!')).toBeTruthy();
    expect(screen.getByText('+245.000 ₫')).toBeTruthy();
    expect(screen.getByText('520.000 ₫')).toBeTruthy();

    await fireEvent.press(screen.getByTestId('star-btn-5'));
    await fireEvent.press(screen.getByTestId('btn-go-home'));
    expect(onHome).toHaveBeenCalledTimes(1);
  });
});

describe('Driver12JourneyPlayground (All 12 States)', () => {
  it('allows seamless switching between all 12 states with dedicated test IDs', async () => {
    const screen = await render(<Driver12JourneyPlayground />);
    
    // State 1 is initial
    expect(screen.getAllByText(/1\. Nổ đơn \(20s đầy\)/i).length).toBeGreaterThanOrEqual(1);

    // Switch to State 4 (Điều hướng lấy hàng)
    await fireEvent.press(screen.getByTestId('switch-state-4'));
    expect(screen.getByTestId('playground-state-4')).toBeTruthy();

    // Switch to State 5 (Đã đến nơi <100m)
    await fireEvent.press(screen.getByTestId('switch-state-5'));
    expect(screen.getByTestId('playground-state-5')).toBeTruthy();

    // Switch to State 6 (POD lấy hàng)
    await fireEvent.press(screen.getByTestId('switch-state-6'));
    expect(screen.getByTestId('playground-state-6')).toBeTruthy();

    // Switch to State 7 (Đa chặng)
    await fireEvent.press(screen.getByTestId('switch-state-7'));
    expect(screen.getByTestId('playground-state-7')).toBeTruthy();

    // Switch to State 8 (COD)
    await fireEvent.press(screen.getByTestId('switch-state-8'));
    expect(screen.getByTestId('playground-state-8')).toBeTruthy();

    // Switch to State 9 (Thất bại)
    await fireEvent.press(screen.getByTestId('switch-state-9'));
    expect(screen.getByTestId('playground-state-9')).toBeTruthy();

    // Switch to State 10 (Hoàn tất)
    await fireEvent.press(screen.getByTestId('switch-state-10'));
    expect(screen.getByTestId('playground-state-10')).toBeTruthy();

    // Switch to State 12 (Dark Mode)
    await fireEvent.press(screen.getByTestId('switch-state-12'));
    expect(screen.getByTestId('playground-dark-surface')).toBeTruthy();
  });
});
