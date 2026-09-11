import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render } from '@testing-library/react-native';

import { PromotionsScreen } from './PromotionsScreen';

const mockBack = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({
    back: mockBack,
  }),
}));

describe('PromotionsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders input card and promotion vouchers list', async () => {
    const screen = await render(<PromotionsScreen />);

    expect(screen.getByText('Khuyến mãi')).toBeTruthy();
    expect(screen.getByText('Nhập mã khuyến mãi')).toBeTruthy();
    expect(screen.getByText('MÃ KHUYẾN MÃI CÓ SẴN')).toBeTruthy();
    expect(screen.getByText('LEOPARD20')).toBeTruthy();
    expect(screen.getByText('VAN50K')).toBeTruthy();
    expect(screen.getByText('TRUCK100')).toBeTruthy();

    await screen.unmount();
  });

  it('applies promotion code from list', async () => {
    const screen = await render(<PromotionsScreen />);

    const useBtn = screen.getByLabelText('Sử dụng mã LEOPARD20');
    await fireEvent.press(useBtn);

    expect(screen.getByText('Đang dùng')).toBeTruthy();
    expect(screen.getByText('Đã áp dụng')).toBeTruthy();

    await screen.unmount();
  });
});
