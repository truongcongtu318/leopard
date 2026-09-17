import { describe, expect, it } from '@jest/globals';
import { fireEvent, render } from '@testing-library/react-native';

import { DriverSettingsScreen } from './DriverSettingsScreen';

describe('DriverSettingsScreen', () => {
  it('renders all settings categories and essential switches', async () => {
    const screen = await render(<DriverSettingsScreen />);

    // Essential setting rows
    expect(screen.getByText('Tự động nhận đơn')).toBeTruthy();
    expect(screen.getByText('Âm báo chuyến mới')).toBeTruthy();
    expect(screen.getByText('Rung khi có đơn mới')).toBeTruthy();
    expect(screen.getByText('Tự động nghỉ sau chuyến này')).toBeTruthy();

    // Section headings
    expect(screen.getByText('Báo hiệu & điều phối')).toBeTruthy();
    expect(screen.getByText('Bản đồ & dẫn đường xe tải')).toBeTruthy();
    expect(screen.getByText('Màn hình & tối ưu pin')).toBeTruthy();
    expect(screen.getByText('Trợ giúp & hỗ trợ')).toBeTruthy();

    await screen.unmount();
  });

  it('settings has no hardcoded diagnostics or fake gimmick features', async () => {
    const screen = await render(<DriverSettingsScreen />);

    // Removed gimmick items
    expect(screen.queryByText('Đề xuất giá cước')).toBeNull();
    expect(screen.queryByText('Mức âm lượng chuông điều phối:')).toBeNull();
    expect(screen.queryByText('Nghe thử chuông nổ đơn')).toBeNull();
    expect(screen.queryByText('Giọng nói đọc tóm tắt đơn hàng')).toBeNull();
    expect(screen.queryByText('Dọn dẹp bộ nhớ đệm (Cache)')).toBeNull();

    // Diagnostics
    expect(screen.queryByText('±3m · Cao')).toBeNull();
    expect(screen.queryByText('24 ms')).toBeNull();
    expect(screen.queryByText('142 MB')).toBeNull();
    expect(screen.queryByText(/v2\.4\.0-pilot/)).toBeNull();
    expect(screen.queryByText(/1900 1919/)).toBeNull();

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

  it('allows tapping reset defaults, support and emergency SOS buttons', async () => {
    const screen = await render(<DriverSettingsScreen />);

    const resetBtn = screen.getByRole('button', { name: 'Khôi phục cài đặt gốc' });
    await fireEvent.press(resetBtn);

    const supportBtn = screen.getByRole('button', { name: 'Tổng đài hỗ trợ đối tác' });
    expect(supportBtn).toBeTruthy();
    await fireEvent.press(supportBtn);

    const sosBtn = screen.getByRole('button', { name: 'Nút gọi khẩn cấp SOS' });
    expect(sosBtn).toBeTruthy();
    expect(screen.getByText('Gọi cứu hộ khẩn cấp SOS (24/7)')).toBeTruthy();
    await fireEvent.press(sosBtn);

    await screen.unmount();
  });
});
