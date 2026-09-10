import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render } from '@testing-library/react-native';

import { DriverHistoryScreen } from './DriverHistoryScreen';

jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    back: jest.fn(),
  }),
}));

describe('DriverHistoryScreen', () => {
  it('renders history screen with double-bezel cards and trips', async () => {
    const screen = await render(<DriverHistoryScreen />);

    expect(screen.getByText('Lịch sử chuyến')).toBeTruthy();
    expect(screen.getByText('LP-D-260815-001')).toBeTruthy();
    expect(screen.getByText('Kho Tân Bình, TP.HCM')).toBeTruthy();
    expect(screen.getByText('14.2 km')).toBeTruthy();

    await screen.unmount();
  });

  it('filters trips by date (today / week)', async () => {
    const screen = await render(<DriverHistoryScreen />);

    const todayFilter = screen.getByRole('button', { name: 'Lọc chuyến hôm nay' });
    await fireEvent.press(todayFilter);

    expect(screen.getByText('LP-D-260815-001')).toBeTruthy();
    expect(screen.getByText('LP-D-260815-002')).toBeTruthy();
    expect(screen.queryByText('LP-D-260814-009')).toBeNull();

    await screen.unmount();
  });

  it('can open e-POD modal to view proof photo watermark and customer signature', async () => {
    const screen = await render(<DriverHistoryScreen />);

    const viewEpodBtn = screen.getByRole('button', {
      name: 'Xem ảnh e-POD của chuyến LP-D-260815-001',
    });
    await fireEvent.press(viewEpodBtn);

    expect(screen.getByText('Chứng từ điện tử e-POD')).toBeTruthy();
    expect(screen.getByText('GPS: 10.8231° N, 106.6297° E')).toBeTruthy();
    expect(screen.getByText('Người ký nhận: Thủ kho Nguyễn Văn Bình')).toBeTruthy();

    await screen.unmount();
  });
});
