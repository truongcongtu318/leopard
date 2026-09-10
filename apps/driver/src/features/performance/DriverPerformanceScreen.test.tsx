import { describe, expect, it, jest } from '@jest/globals';
import { render } from '@testing-library/react-native';

import { DriverPerformanceScreen } from './DriverPerformanceScreen';

jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    back: jest.fn(),
  }),
}));

describe('DriverPerformanceScreen', () => {
  it('renders rating 4.98, tier progression, and operational KPI metrics', async () => {
    const screen = await render(<DriverPerformanceScreen />);

    expect(screen.getByText('Điểm hiệu suất')).toBeTruthy();
    expect(screen.getByText('4.98')).toBeTruthy();
    expect(screen.getByText('HẠNG VÀNG')).toBeTruthy();
    expect(screen.getByText('99.4%')).toBeTruthy();
    expect(screen.getByText('Tỷ lệ đúng giờ (OTD)')).toBeTruthy();
    expect(screen.getByText('96.5%')).toBeTruthy();
    expect(screen.getByText('Tỷ lệ nhận cuốc')).toBeTruthy();
    expect(screen.getByText('0.8%')).toBeTruthy();
    expect(screen.getByText('Tỷ lệ hủy cuốc')).toBeTruthy();
    expect(screen.getByText('100%')).toBeTruthy();
    expect(screen.getByText('Chuẩn')).toBeTruthy();
    expect(screen.getByText('Bạc')).toBeTruthy();
    expect(screen.getByText('Vàng')).toBeTruthy();
    expect(screen.getByText('Kim Cương')).toBeTruthy();

    await screen.unmount();
  });
});
