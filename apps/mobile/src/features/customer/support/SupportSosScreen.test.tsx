import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render } from '@testing-library/react-native';
import { Linking } from 'react-native';

import { SupportSosScreen } from './SupportSosScreen';

const mockBack = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({
    back: mockBack,
  }),
}));

describe('SupportSosScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Linking, 'openURL').mockImplementation(async () => true);
  });

  it('renders hotline, SOS, FAQs, Legal sections and feedback form', async () => {
    const screen = await render(<SupportSosScreen />);

    expect(screen.getByText('Trợ giúp & SOS')).toBeTruthy();
    expect(screen.getByText('1900 6868')).toBeTruthy();
    expect(screen.getByText('Báo cáo khẩn cấp (SOS)')).toBeTruthy();
    expect(screen.getByText('CÂU HỎI THƯỜNG GẶP (FAQ)')).toBeTruthy();
    expect(screen.getByText('ĐIỀU KHOẢN DỊCH VỤ & CHÍNH SÁCH BẢO MẬT')).toBeTruthy();
    expect(screen.getByText('GỬI Ý KIẾN ĐÓNG GÓP')).toBeTruthy();

    await screen.unmount();
  });

  it('triggers phone call on hotline press', async () => {
    const screen = await render(<SupportSosScreen />);

    const callBtn = screen.getByLabelText('Gọi hotline tổng đài 1900 6868');
    await fireEvent.press(callBtn);

    expect(Linking.openURL).toHaveBeenCalledWith('tel:19006868');
    await screen.unmount();
  });

  it('expands and collapses FAQ accordion', async () => {
    const screen = await render(<SupportSosScreen />);

    const faqQuestion = screen.getByText('Làm thế nào để hủy đơn hàng?');
    expect(screen.queryByText(/Nếu tài xế đã lấy hàng, vui lòng liên hệ trực tiếp tổng đài/)).toBeNull();

    await fireEvent.press(faqQuestion);
    expect(screen.getByText(/Nếu tài xế đã lấy hàng, vui lòng liên hệ trực tiếp tổng đài/)).toBeTruthy();

    await fireEvent.press(faqQuestion);
    expect(screen.queryByText(/Nếu tài xế đã lấy hàng, vui lòng liên hệ trực tiếp tổng đài/)).toBeNull();

    await screen.unmount();
  });

  it('opens and closes legal terms and privacy modals', async () => {
    const screen = await render(<SupportSosScreen />);

    // Open Terms
    const termsRow = screen.getByLabelText('Xem Điều khoản dịch vụ vận chuyển');
    await fireEvent.press(termsRow);

    expect(screen.getAllByText('Điều khoản dịch vụ vận chuyển LEOPARD').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/bảo hiểm trách nhiệm hàng hóa/)).toBeTruthy();

    // Close Terms
    const closeBtn = screen.getByRole('button', { name: 'Đã hiểu' });
    await fireEvent.press(closeBtn);
    expect(screen.queryByText(/bảo hiểm trách nhiệm hàng hóa/)).toBeNull();

    // Open Privacy
    const privacyRow = screen.getByLabelText('Xem Chính sách bảo mật dữ liệu');
    await fireEvent.press(privacyRow);

    expect(screen.getAllByText('Chính sách bảo mật & Quyền riêng tư').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/QUYỀN XÓA TÀI KHOẢN/)).toBeTruthy();

    await screen.unmount();
  });
});
