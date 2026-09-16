import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render } from '@testing-library/react-native';

import { DriverHistoryScreen, type HistoryTripItem } from './DriverHistoryScreen';

jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    back: jest.fn(),
  }),
}));

const fixtureItems: readonly HistoryTripItem[] = [
  {
    id: 'ord-001',
    reference: 'LP-D-260815-001',
    origin: 'Kho Tân Bình, TP.HCM',
    destination: 'TP. Thủ Đức, TP.HCM',
    distanceLabel: '14.2 km',
    cargoSummary: '40 bao xi măng INSEE (2.000 kg)',
    completedAtLabel: '15/08/2026 · 14:32',
    datePeriod: 'today',
    payoutAmount: 170000,
    status: 'DELIVERED',
    hasProof: true,
    signerName: 'Thủ kho Nguyễn Văn Bình',
    vehicleLabel: 'Xe tải 2.5T',
  },
  {
    id: 'ord-002',
    reference: 'LP-D-260815-002',
    origin: 'Cảng Cát Lái, Quận 2',
    destination: 'KCN Tân Bình, Tân Phú',
    distanceLabel: '18.5 km',
    cargoSummary: 'Kiện pallet linh kiện điện tử (1.5T)',
    completedAtLabel: '15/08/2026 · 11:15',
    datePeriod: 'today',
    payoutAmount: 250000,
    status: 'DELIVERED',
    hasProof: true,
    signerName: 'Trưởng kho Lê Hoàng Long',
    vehicleLabel: 'Xe tải 1.5T',
  },
  {
    id: 'ord-003',
    reference: 'LP-D-260814-009',
    origin: 'Chợ Đầu Mối Thủ Đức',
    destination: 'Quận 1, TP.HCM',
    distanceLabel: '12.0 km',
    cargoSummary: 'Rau củ quả Đà Lạt (800 kg)',
    completedAtLabel: '14/08/2026 · 18:20',
    datePeriod: 'week',
    payoutAmount: 0,
    status: 'CANCELLED',
    hasProof: false,
    vehicleLabel: 'Xe máy',
  },
];

describe('DriverHistoryScreen', () => {
  it('renders history screen with double-bezel cards and trips', async () => {
    const screen = await render(<DriverHistoryScreen items={fixtureItems} total={128} />);

    expect(screen.getByText('Lịch sử chuyến')).toBeTruthy();
    expect(screen.getByText('LP-D-260815-001')).toBeTruthy();
    expect(screen.getByText('Kho Tân Bình, TP.HCM')).toBeTruthy();
    expect(screen.getByText('14.2 km')).toBeTruthy();
    expect(screen.getByText('128')).toBeTruthy();
    expect(screen.getByTestId('driver-bottom-navigation')).toBeTruthy();

    await screen.unmount();
  });

  it('filters trips by date (today / week)', async () => {
    const screen = await render(<DriverHistoryScreen items={fixtureItems} total={128} />);

    const todayFilter = screen.getByRole('button', { name: 'Lọc chuyến hôm nay' });
    await fireEvent.press(todayFilter);

    expect(screen.getByText('LP-D-260815-001')).toBeTruthy();
    expect(screen.getByText('LP-D-260815-002')).toBeTruthy();
    expect(screen.queryByText('LP-D-260814-009')).toBeNull();

    await screen.unmount();
  });

  it('can open e-POD modal to view proof photo watermark and customer signature', async () => {
    const screen = await render(<DriverHistoryScreen items={fixtureItems} total={128} />);

    const viewEpodBtn = screen.getByRole('button', {
      name: 'Xem ảnh e-POD của chuyến LP-D-260815-001',
    });
    await fireEvent.press(viewEpodBtn);

    expect(screen.getByText('Chứng từ điện tử e-POD')).toBeTruthy();
    expect(screen.getByText('GPS: 10.8231° N, 106.6297° E')).toBeTruthy();
    expect(screen.getByText('Người ký nhận: Thủ kho Nguyễn Văn Bình')).toBeTruthy();

    await screen.unmount();
  });

  it('shows a loading state', async () => {
    const screen = await render(<DriverHistoryScreen isLoading items={[]} total={0} />);
    expect(screen.getByText('Lịch sử chuyến')).toBeTruthy();
    await screen.unmount();
  });

  it('shows a retryable error state', async () => {
    const onRetry = jest.fn();
    const screen = await render(<DriverHistoryScreen isError items={[]} onRetry={onRetry} total={0} />);

    const retryBtn = screen.getByRole('button', { name: 'Thử lại' });
    await fireEvent.press(retryBtn);
    expect(onRetry).toHaveBeenCalledTimes(1);

    await screen.unmount();
  });

  it('filters trips by status (Tất cả / Đã giao / Đã hủy)', async () => {
    const screen = await render(<DriverHistoryScreen items={fixtureItems} total={128} />);

    const deliveredFilter = screen.getByRole('button', { name: 'Lọc Đã giao' });
    await fireEvent.press(deliveredFilter);
    expect(screen.getByText('LP-D-260815-001')).toBeTruthy();
    expect(screen.getByText('LP-D-260815-002')).toBeTruthy();
    expect(screen.queryByText('LP-D-260814-009')).toBeNull();

    const cancelledFilter = screen.getByRole('button', { name: 'Lọc Đã hủy' });
    await fireEvent.press(cancelledFilter);
    expect(screen.getByText('LP-D-260814-009')).toBeTruthy();
    expect(screen.queryByText('LP-D-260815-001')).toBeNull();

    const allFilter = screen.getByRole('button', { name: 'Lọc Tất cả' });
    await fireEvent.press(allFilter);
    expect(screen.getByText('LP-D-260815-001')).toBeTruthy();
    expect(screen.getByText('LP-D-260814-009')).toBeTruthy();

    await screen.unmount();
  });

  it('opens e-POD review modal with testID and verifies photo, signature and recipient name', async () => {
    const screen = await render(<DriverHistoryScreen items={fixtureItems} total={128} />);

    const epodBtn = screen.getByTestId('btn-view-epod-ord-001');
    expect(epodBtn).toBeTruthy();
    await fireEvent.press(epodBtn);

    const modal = screen.getByTestId('epod-proof-modal');
    expect(modal).toBeTruthy();
    expect(screen.getByText('Chứng từ điện tử e-POD')).toBeTruthy();
    expect(screen.getByText('Ảnh hạ tải tại điểm giao')).toBeTruthy();
    expect(screen.getByText('Chữ ký xác nhận nhận hàng')).toBeTruthy();
    expect(screen.getByText('Người ký nhận: Thủ kho Nguyễn Văn Bình')).toBeTruthy();

    await screen.unmount();
  });
});
