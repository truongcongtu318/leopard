import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render } from '@testing-library/react-native';

import { CustomerWalletScreen } from './CustomerWalletScreen';

describe('CustomerWalletScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });


  it('renders wallet card with balance, brand pill, security badge, and action buttons', async () => {
    const screen = await render(<CustomerWalletScreen />);

    expect(screen.getByText('Ví & Thanh toán')).toBeTruthy();
    expect(screen.getByText('Ví VietQR LEOPARD')).toBeTruthy();
    expect(screen.getByText('Bảo mật 100%')).toBeTruthy();
    expect(screen.getByText('SỐ DƯ KHẢ DỤNG')).toBeTruthy();
    expect(screen.getByText('+ Nạp tiền')).toBeTruthy();
    expect(screen.getByText('Quét QR')).toBeTruthy();
    expect(screen.getByText('Rút tiền')).toBeTruthy();
    expect(screen.getByText('PHƯƠNG THỨC LIÊN KẾT')).toBeTruthy();
    expect(screen.getByText('LỊCH SỬ GIAO DỊCH GẦN ĐÂY')).toBeTruthy();

    await screen.unmount();
  });

  it('toggles balance visibility when eye icon is pressed', async () => {
    const screen = await render(<CustomerWalletScreen />);

    // Initially, balance is visible with 1.250.000 ₫
    expect(screen.getByText(/1\.250\.000/)).toBeTruthy();

    // Press eye toggle to hide balance
    const hideBtn = screen.getByLabelText('Ẩn số dư');
    await fireEvent.press(hideBtn);

    // Balance masked
    expect(screen.getByText('•••••••• ₫')).toBeTruthy();
    expect(screen.queryByText(/1\.250\.000/)).toBeNull();

    // Press eye toggle to show balance again
    const showBtn = screen.getByLabelText('Hiện số dư');
    await fireEvent.press(showBtn);

    expect(screen.getByText(/1\.250\.000/)).toBeTruthy();

    await screen.unmount();
  });

  it('opens top-up section and selects preset amounts', async () => {
    const screen = await render(<CustomerWalletScreen />);

    // Click + Nạp tiền
    const topupBtn = screen.getByLabelText('+ Nạp tiền');
    await fireEvent.press(topupBtn);

    // Should display presets section
    expect(screen.getByText('CHỌN SỐ TIỀN NẠP NHANH')).toBeTruthy();
    expect(screen.getByText('Phổ biến')).toBeTruthy();
    expect(screen.getByText('Khuyên dùng')).toBeTruthy();

    // Select 500,000 preset
    const preset500k = screen.getByLabelText(/500\.000/);
    await fireEvent.press(preset500k);

    // Confirmation button reflects selected 500,000
    expect(screen.getByRole('button', { name: /Tạo mã VietQR cho.*500\.000/ })).toBeTruthy();

    await screen.unmount();
  });

  it('generates VietQR code and supports copy-to-clipboard interactions', async () => {
    const screen = await render(<CustomerWalletScreen />);

    // Open Topup
    await fireEvent.press(screen.getByLabelText('+ Nạp tiền'));

    // Confirm topup with default 200k
    const confirmBtn = screen.getByRole('button', { name: /Tạo mã VietQR cho/ });
    await fireEvent.press(confirmBtn);

    // VietQR view is now active
    expect(screen.getByText('MÃ THANH TOÁN VIETQR PRO')).toBeTruthy();
    expect(screen.getByText('NAPAS 24/7')).toBeTruthy();
    expect(screen.getByText('Vietcombank (VCB)')).toBeTruthy();
    expect(screen.getByText('0900000001')).toBeTruthy();
    expect(screen.getByText('LEOPARD TOPUP 0900000001')).toBeTruthy();

    // Test copy account number
    const copyAccBtn = screen.getByLabelText('Sao chép số tài khoản');
    await fireEvent.press(copyAccBtn);
    expect(screen.getByText('Đã chép ✓')).toBeTruthy();

    // Test complete top-up: 1,250,000 + 200,000 = 1,450,000
    const completeBtn = screen.getByRole('button', { name: 'Hoàn tất nạp tiền' });
    await fireEvent.press(completeBtn);

    // Modal closes and balance is updated
    expect(screen.queryByText('MÃ THANH TOÁN VIETQR PRO')).toBeNull();
    expect(screen.getByText(/1\.450\.000/)).toBeTruthy();

    await screen.unmount();
  });

  it('filters transactions by tab (All, Nạp tiền, Thanh toán, Hoàn tiền)', async () => {
    const screen = await render(<CustomerWalletScreen />);

    // All transactions initially shown
    expect(screen.getByText('Thanh toán cước vận chuyển')).toBeTruthy();
    expect(screen.getByText('Nạp tiền qua VietQR')).toBeTruthy();
    expect(screen.getByText('Hoàn tiền chênh lệch quãng đường')).toBeTruthy();

    // Filter by Nạp tiền
    await fireEvent.press(screen.getByLabelText('Nạp tiền'));
    expect(screen.getByText('Nạp tiền qua VietQR')).toBeTruthy();
    expect(screen.queryByText('Thanh toán cước vận chuyển')).toBeNull();
    expect(screen.queryByText('Hoàn tiền chênh lệch quãng đường')).toBeNull();

    // Filter by Hoàn tiền
    await fireEvent.press(screen.getByLabelText('Hoàn tiền'));
    expect(screen.getByText('Hoàn tiền chênh lệch quãng đường')).toBeTruthy();
    expect(screen.queryByText('Nạp tiền qua VietQR')).toBeNull();
    expect(screen.queryByText('Thanh toán cước vận chuyển')).toBeNull();

    // Filter by Thanh toán
    await fireEvent.press(screen.getByLabelText('Thanh toán'));
    expect(screen.getByText('Thanh toán cước vận chuyển')).toBeTruthy();
    expect(screen.queryByText('Nạp tiền qua VietQR')).toBeNull();

    // Filter back to Tất cả
    await fireEvent.press(screen.getByLabelText('Tất cả'));
    expect(screen.getByText('Thanh toán cước vận chuyển')).toBeTruthy();
    expect(screen.getByText('Nạp tiền qua VietQR')).toBeTruthy();

    await screen.unmount();
  });
});
