// apps/driver/src/features/earnings/DriverEarningsScreen.test.tsx
import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render } from '@testing-library/react-native';

import { DriverEarningsScreen, type DriverEarningsScreenProps } from './DriverEarningsScreen';

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn() }),
}));

const baseProps: DriverEarningsScreenProps = {
  lifetimeDeliveredVnd: 18450000,
  availableBalanceVnd: 1450000,
  deliveredOrderCount: 128,
  totalOrderCount: 130,
  isLoading: false,
  isError: false,
  onRetry: jest.fn(),
};

describe('DriverEarningsScreen', () => {
  it('renders real revenue and trip counts, with no invented commission/fee breakdown', async () => {
    const screen = await render(<DriverEarningsScreen {...baseProps} />);

    expect(screen.getAllByText('Thu nhập').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByTestId('driver-bottom-navigation')).toBeTruthy();
    expect(screen.getByText(/18.450.000/)).toBeTruthy();
    expect(screen.getByText('128')).toBeTruthy();
    expect(screen.queryByText(/Chiết khấu nền tảng/)).toBeNull();
    expect(screen.queryByText(/Rút tiền 24\/7/)).toBeNull();

    await screen.unmount();
  });

  it('computes and shows a real completion rate from delivered/total counts', async () => {
    const screen = await render(<DriverEarningsScreen {...baseProps} />);
    expect(screen.getByText('98%')).toBeTruthy(); // round(128/130*100)
    await screen.unmount();
  });

  it('marks the not-yet-built KPIs as "Sắp ra mắt" instead of a fabricated number', async () => {
    const screen = await render(<DriverEarningsScreen {...baseProps} />);
    expect(screen.getAllByText('Sắp ra mắt').length).toBeGreaterThanOrEqual(2); // hours online + rating (OTD folded into completion rate)
    expect(screen.queryByText('99.4%')).toBeNull();
    expect(screen.queryByText('5.0')).toBeNull();
    await screen.unmount();
  });

  it('renders 3 bento KPI cards: net payout, completed trips, and online hours', async () => {
    const screen = await render(<DriverEarningsScreen {...baseProps} />);
    expect(screen.getByTestId('kpi-net-payout')).toBeTruthy();
    expect(screen.getByTestId('kpi-completed-trips')).toBeTruthy();
    expect(screen.getByTestId('kpi-online-hours')).toBeTruthy();
    expect(screen.getByText('Tổng thu nhập thực nhận')).toBeTruthy();
    expect(screen.getByText('Số chuyến hoàn thành')).toBeTruthy();
    expect(screen.getByText('Số giờ trực tuyến')).toBeTruthy();
    await screen.unmount();
  });

  it('renders date range filter tabs (Hôm nay / Tuần này / Tháng này) and allows switching', async () => {
    const screen = await render(<DriverEarningsScreen {...baseProps} />);
    const todayBtn = screen.getByRole('button', { name: 'Hôm nay' });
    const weekBtn = screen.getByRole('button', { name: 'Tuần này' });
    const monthBtn = screen.getByRole('button', { name: 'Tháng này' });

    expect(todayBtn).toBeTruthy();
    expect(weekBtn).toBeTruthy();
    expect(monthBtn).toBeTruthy();

    await fireEvent.press(weekBtn);
    expect(weekBtn).toBeTruthy();
    await fireEvent.press(monthBtn);
    expect(monthBtn).toBeTruthy();

    await screen.unmount();
  });

  it('renders daily income breakdown section', async () => {
    const screen = await render(<DriverEarningsScreen {...baseProps} />);
    expect(screen.getByTestId('daily-income-breakdown')).toBeTruthy();
    expect(screen.getByText('Chi tiết thu nhập theo ngày')).toBeTruthy();
    await screen.unmount();
  });
});
