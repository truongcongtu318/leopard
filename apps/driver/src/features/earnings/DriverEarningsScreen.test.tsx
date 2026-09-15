// apps/driver/src/features/earnings/DriverEarningsScreen.test.tsx
import { describe, expect, it } from '@jest/globals';
import { render } from '@testing-library/react-native';
import { jest } from '@jest/globals';

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
    expect(screen.getByText('128 cuốc xe')).toBeTruthy();
    expect(screen.queryByText(/Chiết khấu nền tảng/)).toBeNull();
    expect(screen.queryByText(/Rút tiền 24\/7/)).toBeNull();

    await screen.unmount();
  });

  it('computes and shows a real completion rate from delivered/total counts', async () => {
    const screen = await render(<DriverEarningsScreen {...baseProps} />);
    expect(screen.getByText('98%')).toBeTruthy(); // round(128/130*100)
    await screen.unmount();
  });

  it('shows 0đ on the today/week/month cards instead of a fabricated per-period number', async () => {
    // The API only reports a lifetime total — no real per-period breakdown yet.
    const screen = await render(<DriverEarningsScreen {...baseProps} />);
    expect(screen.getByTestId('kpi-period-today')).toBeTruthy();
    expect(screen.getByTestId('kpi-period-week')).toBeTruthy();
    expect(screen.getByTestId('kpi-period-month')).toBeTruthy();
    expect(screen.getAllByText('0 ₫').length).toBe(3);
    await screen.unmount();
  });

  it('renders the real-totals rows: lifetime earnings, completed trips, available balance', async () => {
    const screen = await render(<DriverEarningsScreen {...baseProps} />);
    expect(screen.getByTestId('kpi-net-payout')).toBeTruthy();
    expect(screen.getByTestId('kpi-completed-trips')).toBeTruthy();
    expect(screen.getByText('Tổng thu nhập (trọn đời)')).toBeTruthy();
    expect(screen.getByText('Cuốc xe đã hoàn tất')).toBeTruthy();
    expect(screen.getByText('Số dư khả dụng để rút')).toBeTruthy();
    await screen.unmount();
  });

  it('renders a horizontal carousel of period cards (Hôm nay / Tuần này / Tháng này)', async () => {
    const screen = await render(<DriverEarningsScreen {...baseProps} />);
    expect(screen.getByText('Thu nhập hôm nay')).toBeTruthy();
    expect(screen.getByText('Thu nhập tuần này')).toBeTruthy();
    expect(screen.getByText('Thu nhập tháng này')).toBeTruthy();
    await screen.unmount();
  });
});
