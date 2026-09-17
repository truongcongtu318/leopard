import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, waitFor } from '@testing-library/react-native';

import { httpClient } from '@leopard/mobile-core/src/api/http-client';
import { PromotionsScreen } from './PromotionsScreen';

const mockBack = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({
    back: mockBack,
  }),
}));

jest.mock('@leopard/mobile-core/src/api/http-client', () => ({
  httpClient: {
    get: jest.fn(),
    post: jest.fn(),
  },
}));

const mockPromotionsApi = [
  {
    id: 'promo-1',
    code: 'LEOPARD20',
    title: 'Giảm 20% chuyến hàng đầu tiên',
    description: 'Áp dụng cho mọi loại xe với đơn hàng đầu tiên của khách hàng mới.',
    discountType: 'PERCENT',
    discountValue: 20,
    maxDiscountVnd: 50_000,
    minOrderAmountVnd: 0,
    usageLimit: null,
    usageCount: 0,
    expiresAt: '2026-12-31T23:59:59.999Z',
    isActive: true,
  },
  {
    id: 'promo-2',
    code: 'VAN50K',
    title: 'Ưu đãi xe van 50.000 ₫',
    description: 'Giảm trực tiếp 50k khi đặt chuyến xe van vận chuyển hàng hóa.',
    discountType: 'FIXED',
    discountValue: 50_000,
    maxDiscountVnd: 50_000,
    minOrderAmountVnd: 200_000,
    usageLimit: null,
    usageCount: 0,
    expiresAt: '2026-12-31T23:59:59.999Z',
    isActive: true,
  },
  {
    id: 'promo-3',
    code: 'TRUCK100',
    title: 'Giảm 100.000 ₫ xe tải liên tỉnh',
    description: 'Hỗ trợ cước vận chuyển liên tỉnh cho doanh nghiệp và xưởng may.',
    discountType: 'FIXED',
    discountValue: 100_000,
    maxDiscountVnd: 100_000,
    minOrderAmountVnd: 500_000,
    usageLimit: null,
    usageCount: 0,
    expiresAt: '2026-12-31T23:59:59.999Z',
    isActive: true,
  },
];

describe('PromotionsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (httpClient.get as any).mockResolvedValue(mockPromotionsApi);
    (httpClient.post as any).mockResolvedValue({
      valid: true,
      discountVnd: 20_000,
      voucher: mockPromotionsApi[0],
    });
  });

  it('fetches and renders promotions from API', async () => {
    const screen = await render(<PromotionsScreen />);

    await waitFor(() => expect((httpClient.get as any)).toHaveBeenCalledWith('/promotions'));

    expect(screen.getByText('Khuyến mãi')).toBeTruthy();
    expect(screen.getByText('Mã khuyến mãi có sẵn')).toBeTruthy();
    expect(screen.getByText('LEOPARD20')).toBeTruthy();
    expect(screen.getByText('VAN50K')).toBeTruthy();
    expect(screen.getByText('TRUCK100')).toBeTruthy();

    await screen.unmount();
  });

  it('validates promotion code via API', async () => {
    const screen = await render(<PromotionsScreen />);

    await waitFor(() => expect((httpClient.get as any)).toHaveBeenCalledWith('/promotions'));

    const useBtn = screen.getByLabelText('Sử dụng mã LEOPARD20');
    await fireEvent.press(useBtn);

    await waitFor(() =>
      expect((httpClient.post as any)).toHaveBeenCalledWith('/promotions/validate', {
        code: 'LEOPARD20',
        orderAmountVnd: 500_000,
      }),
    );

    expect(screen.getByText('Đang dùng')).toBeTruthy();
    expect(screen.getByText(/Đã áp dụng mã LEOPARD20/)).toBeTruthy();

    await screen.unmount();
  });
});
