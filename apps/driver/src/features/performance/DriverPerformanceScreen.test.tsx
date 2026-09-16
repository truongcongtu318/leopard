import { describe, expect, it, jest } from '@jest/globals';
import { render } from '@testing-library/react-native';

import { DriverPerformanceScreen } from './DriverPerformanceScreen';

jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    back: jest.fn(),
  }),
}));

const baseProps = {
  acceptancePct: 96.5,
  cancellationPct: 0.8,
  isError: false,
  isLoading: false,
  onRetry: jest.fn(),
  ratingAvg: 4.98,
  ratingCount: 128,
  recentReviews: [
    { id: 'r-1', orderId: 'o-1', rating: 5, comment: 'Giao hàng nhanh.', createdAt: '2026-09-01T00:00:00.000Z' },
  ],
};

describe('DriverPerformanceScreen', () => {
  it('renders real rating and operational KPI metrics from props', async () => {
    const screen = await render(<DriverPerformanceScreen {...baseProps} />);

    expect(screen.getByText('Điểm hiệu suất')).toBeTruthy();
    expect(screen.getByText('4.98')).toBeTruthy();
    expect(screen.getByText('128 đánh giá')).toBeTruthy();
    expect(screen.getByText('96.5%')).toBeTruthy();
    expect(screen.getByText('Tỷ lệ nhận cuốc')).toBeTruthy();
    expect(screen.getByText('0.8%')).toBeTruthy();
    expect(screen.getByText('Tỷ lệ hủy cuốc')).toBeTruthy();
    expect(screen.getByText('Giao hàng nhanh.')).toBeTruthy();

    await screen.unmount();
  });

  it('shows a loading state while the summary query is pending', async () => {
    const screen = await render(<DriverPerformanceScreen {...baseProps} isLoading={true} />);

    expect(screen.queryByText('4.98')).toBeNull();

    await screen.unmount();
  });

  it('renders no hardcoded system thresholds and empty state for null KPIs', async () => {
    const screen = await render(
      <DriverPerformanceScreen {...baseProps} acceptancePct={null} cancellationPct={null} />,
    );

    expect(screen.queryByText(/Chuẩn hệ thống/)).toBeNull();
    expect(screen.queryByText(/> 95%/)).toBeNull();
    expect(screen.queryByText(/< 1%/)).toBeNull();
    expect(screen.getAllByText('—').length).toBeGreaterThan(0);

    await screen.unmount();
  });

  it('shows a retry action when the summary query fails', async () => {
    const onRetry = jest.fn();
    const screen = await render(<DriverPerformanceScreen {...baseProps} isError={true} onRetry={onRetry} />);

    expect(screen.getByText('Thử lại')).toBeTruthy();

    await screen.unmount();
  });
});
