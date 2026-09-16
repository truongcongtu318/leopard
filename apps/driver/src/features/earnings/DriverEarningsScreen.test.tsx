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
  todayEarningsVnd: 485000,
  todayJobCount: 3,
  isLoading: false,
  isError: false,
  onRetry: jest.fn(),
};

describe('DriverEarningsScreen', () => {
  it('renders real revenue and trip counts, with no invented commission/fee breakdown', async () => {
    const screen = await render(<DriverEarningsScreen {...baseProps} />);

    expect(screen.getAllByText('Thu nhập').length).toBeGreaterThanOrEqual(1);
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

  it('shows the real today earnings and job count computed from order history', async () => {
    const screen = await render(<DriverEarningsScreen {...baseProps} />);
    expect(screen.getByTestId('kpi-period-today')).toBeTruthy();
    expect(screen.getByText(/485.000/)).toBeTruthy();
    expect(screen.getByText('3 Jobs')).toBeTruthy();
    await screen.unmount();
  });

  it('shows 0đ / 0 Jobs when there are no orders delivered today', async () => {
    const screen = await render(
      <DriverEarningsScreen {...baseProps} todayEarningsVnd={0} todayJobCount={0} />,
    );
    expect(screen.getByText('0 ₫')).toBeTruthy();
    expect(screen.getByText('0 Jobs')).toBeTruthy();
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

  it('renders the today period card (no fabricated week/month breakdown)', async () => {
    const screen = await render(<DriverEarningsScreen {...baseProps} />);
    expect(screen.getByText('Thu nhập hôm nay')).toBeTruthy();
    expect(screen.queryByText('Thu nhập tuần này')).toBeNull();
    expect(screen.queryByText('Thu nhập tháng này')).toBeNull();
    await screen.unmount();
  });
});
