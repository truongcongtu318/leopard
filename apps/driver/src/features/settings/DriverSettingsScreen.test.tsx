import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render } from '@testing-library/react-native';

import { DriverSettingsScreen } from './DriverSettingsScreen';

describe('DriverSettingsScreen', () => {
  it('renders cockpit diagnostics card and all settings categories', async () => {
    const screen = await render(<DriverSettingsScreen />);

    // Diagnostics hero card
    expect(screen.getByText('CHẨN ĐOÁN BUỒNG LÁI')).toBeTruthy();
    expect(screen.getByText('SẴN SÀNG NHẬN ĐƠN')).toBeTruthy();
    expect(screen.getByText('GPS thực địa')).toBeTruthy();
    expect(screen.getByText('±3m · Cao')).toBeTruthy();
    expect(screen.getByText('Server Ping')).toBeTruthy();
    expect(screen.getByText('24 ms')).toBeTruthy();
    expect(screen.getByText('Nghe thử chuông nổ đơn & Test GPS')).toBeTruthy();

    // Section headings
    expect(screen.getByText('BÁO HIỆU & ĐIỀU PHỐI ĐƠN HÀNG')).toBeTruthy();
    expect(screen.getByText('BẢN ĐỒ & DẪN ĐƯỜNG XE TẢI')).toBeTruthy();
    expect(screen.getByText('MÀN HÌNH LÁI XE & TỐI ƯU PIN')).toBeTruthy();
    expect(screen.getByText('QUYỀN THIẾT BỊ & DỌN DẸP DỮ LIỆU')).toBeTruthy();
    expect(screen.getByText('TRỢ GIÚP KỸ THUẬT & PHÁP LÝ')).toBeTruthy();

    await screen.unmount();
  });

  it('can toggle auto-accept switch to reveal radius selector', async () => {
    const screen = await render(<DriverSettingsScreen />);

    expect(screen.queryByText('Bán kính tự động quét cuốc:')).toBeNull();

    const autoAcceptSwitch = screen.getByLabelText('Bật tắt tự động nhận đơn');
    await fireEvent(autoAcceptSwitch, 'valueChange', true);

    expect(screen.getByText('Bán kính tự động quét cuốc:')).toBeTruthy();
    expect(screen.getByText('2 km')).toBeTruthy();
    expect(screen.getByText('5 km')).toBeTruthy();
    expect(screen.getByText('10 km')).toBeTruthy();

    // Switch radius to 10 km
    const btn10Km = screen.getByRole('button', { name: 'Bán kính 10 kilômét' });
    await fireEvent.press(btn10Km);

    await screen.unmount();
  });

  it('can select between Vietmap and Google navigation', async () => {
    const screen = await render(<DriverSettingsScreen />);

    expect(screen.getByText(/Vietmap Navigation/)).toBeTruthy();

    const googleBtn = screen.getByRole('button', { name: 'Chọn bản đồ Google Maps' });
    await fireEvent.press(googleBtn);

    expect(screen.getByText(/Google Maps Navigation/)).toBeTruthy();

    const vietmapBtn = screen.getByRole('button', { name: 'Chọn bản đồ Vietmap' });
    await fireEvent.press(vietmapBtn);

    expect(screen.getByText(/Vietmap Navigation/)).toBeTruthy();

    await screen.unmount();
  });

  it('allows tapping test alert button and reset defaults', async () => {
    const screen = await render(<DriverSettingsScreen />);

    const testBtn = screen.getByRole('button', {
      name: 'Thử nghiệm âm thanh chuông báo và độ nhạy',
    });
    await fireEvent.press(testBtn);

    const resetBtn = screen.getByRole('button', { name: 'Khôi phục cài đặt gốc' });
    await fireEvent.press(resetBtn);

    await screen.unmount();
  });

  it('allows adjusting dispatch alert ringtone volume and displays emergency SOS button', async () => {
    const screen = await render(<DriverSettingsScreen />);

    expect(screen.getByText('Mức âm lượng chuông điều phối:')).toBeTruthy();
    const vol75Btn = screen.getByRole('button', { name: 'Âm lượng 75%' });
    await fireEvent.press(vol75Btn);

    const sosBtn = screen.getByRole('button', { name: 'Nút gọi khẩn cấp SOS' });
    expect(sosBtn).toBeTruthy();
    expect(screen.getByText('GỌI CỨU HỘ KHẨN CẤP SOS (24/7)')).toBeTruthy();

    await screen.unmount();
  });
});
