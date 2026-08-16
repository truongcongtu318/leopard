import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render } from '@testing-library/react-native';

import { DriverOrderDetailScreen } from './DriverOrderDetailScreen';
import { DriverOrdersScreen } from './DriverOrdersScreen';
import { createDriverDetailFixture, createDriverListFixture } from './fixtures';

describe('DriverOrdersScreen', () => {
  it('puts availability and the active trip before public requested summaries', async () => {
    const onOpenOrder = jest.fn();
    const screen = await render(
      <DriverOrdersScreen
        onOpenOrder={onOpenOrder}
        view={createDriverListFixture('D-LIST-ACTIVE-REQUESTED')}
      />,
    );

    expect(screen.getByRole('header', { name: 'Đơn của tài xế' })).toBeTruthy();
    expect(screen.getByText('DRIVER · FIELD COCKPIT')).toBeTruthy();
    expect(screen.getByTestId('driver-active-trip-slab')).toBeTruthy();
    expect(screen.getByText('Trạng thái nhận đơn')).toBeTruthy();
    expect(screen.getByText('Chuyến đang thực hiện')).toBeTruthy();
    expect(screen.getByText('Đơn có thể nhận')).toBeTruthy();
    expect(screen.getByText('Khu vực Quận 7 → Thành phố Thủ Đức')).toBeTruthy();
    expect(screen.queryByText('Số điện thoại khách hàng mô phỏng')).toBeNull();

    await fireEvent.press(screen.getByRole('button', { name: /Mở chuyến LP-D-260815-001/ }));
    expect(onOpenOrder).toHaveBeenCalledWith('22222222-2222-4222-8222-222222222001');
    await screen.unmount();
  });

  it('blocks repeated availability updates while pending', async () => {
    const onSetAvailability = jest.fn();
    const screen = await render(
      <DriverOrdersScreen
        onSetAvailability={onSetAvailability}
        view={createDriverListFixture('D-LIST-AVAILABILITY-PENDING')}
      />,
    );
    const toggle = screen.getByRole('button', { name: 'Đang cập nhật trạng thái nhận đơn' });
    await fireEvent.press(toggle);
    await fireEvent.press(toggle);
    expect(toggle.props.accessibilityState).toMatchObject({ busy: true, disabled: true });
    expect(onSetAvailability).not.toHaveBeenCalled();
    await screen.unmount();
  });

  it('does not mount active or requested orders at a permission boundary', async () => {
    const screen = await render(
      <DriverOrdersScreen view={createDriverListFixture('D-LIST-PERMISSION')} />,
    );
    expect(screen.getByText('Bạn không có quyền xem khu vực tài xế')).toBeTruthy();
    expect(screen.queryByText('Khu vực Quận 7 → Thành phố Thủ Đức')).toBeNull();
    await screen.unmount();
  });
});

describe('DriverOrderDetailScreen', () => {
  it('renders public summary and one accept action without assigned private fields', async () => {
    const onExecuteTask = jest.fn();
    const screen = await render(
      <DriverOrderDetailScreen
        onExecuteTask={onExecuteTask}
        view={createDriverDetailFixture('D-DETAIL-PUBLIC-REQUESTED')}
      />,
    );

    expect(screen.getByText('Khu vực Quận 7 → Thành phố Thủ Đức')).toBeTruthy();
    expect(screen.queryByText('Kho riêng tư mô phỏng tại Quận 7')).toBeNull();
    expect(screen.queryByText('Số điện thoại khách hàng mô phỏng')).toBeNull();
    const accept = screen.getByRole('button', { name: 'Nhận đơn' });
    await fireEvent.press(accept);
    expect(onExecuteTask).toHaveBeenCalledWith('cmd-accept-demo');
    expect(screen.getAllByRole('button')).toHaveLength(1);
    await screen.unmount();
  });

  it('blocks duplicate accept while pending', async () => {
    const onExecuteTask = jest.fn();
    const screen = await render(
      <DriverOrderDetailScreen
        onExecuteTask={onExecuteTask}
        view={createDriverDetailFixture('D-DETAIL-ACCEPT-PENDING')}
      />,
    );
    const accept = screen.getByRole('button', { name: 'Đang nhận đơn' });
    await fireEvent.press(accept);
    await fireEvent.press(accept);
    expect(onExecuteTask).not.toHaveBeenCalled();
    expect(accept.props.accessibilityState).toMatchObject({ busy: true, disabled: true });
    await screen.unmount();
  });

  it('renders a 409 race as a safe conflict and never flashes assigned detail', async () => {
    const onResolveConflict = jest.fn();
    const screen = await render(
      <DriverOrderDetailScreen
        onResolveConflict={onResolveConflict}
        view={createDriverDetailFixture('D-DETAIL-ACCEPT-RACE')}
      />,
    );

    expect(screen.getByText('Tài xế khác vừa nhận đơn này.')).toBeTruthy();
    expect(screen.queryByText('Kho riêng tư mô phỏng tại Quận 7')).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: 'Xem đơn còn trống' }));
    expect(onResolveConflict).toHaveBeenCalledTimes(1);
    await screen.unmount();
  });

  it('makes delivery proof the only primary task until proof persists', async () => {
    const onSelectProof = jest.fn();
    const screen = await render(
      <DriverOrderDetailScreen
        onSelectProof={onSelectProof}
        view={createDriverDetailFixture('D-DETAIL-PROOF-REQUIRED')}
      />,
    );

    expect(screen.getByText('Cần ảnh xác nhận trước khi hoàn tất')).toBeTruthy();
    expect(screen.queryByText('Xác nhận đã giao')).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: 'Thêm ảnh xác nhận giao hàng' }));
    expect(onSelectProof).toHaveBeenCalledTimes(1);
    await screen.unmount();
  });

  it('offers DELIVERED only in the persisted-proof snapshot', async () => {
    const onExecuteTask = jest.fn();
    const screen = await render(
      <DriverOrderDetailScreen
        onExecuteTask={onExecuteTask}
        view={createDriverDetailFixture('D-DETAIL-READY-DELIVER')}
      />,
    );

    expect(screen.getByText('Ảnh xác nhận đã tải lên')).toBeTruthy();
    expect(screen.getByText('DRIVER · ACTIVE MISSION')).toBeTruthy();
    expect(screen.getByTestId('route-map-schematic')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Xác nhận đã giao' }));
    expect(onExecuteTask).toHaveBeenCalledWith('cmd-deliver-demo');
    await screen.unmount();
  });

  it('shows location permission recovery through an injected native port callback', async () => {
    const onOpenLocationSettings = jest.fn();
    const screen = await render(
      <DriverOrderDetailScreen
        onOpenLocationSettings={onOpenLocationSettings}
        view={createDriverDetailFixture('D-DETAIL-LOCATION-DENIED')}
      />,
    );
    expect(screen.getAllByText('Chưa được phép dùng vị trí').length).toBeGreaterThanOrEqual(1);
    await fireEvent.press(screen.getByRole('button', { name: 'Mở cài đặt vị trí' }));
    expect(onOpenLocationSettings).toHaveBeenCalledTimes(1);
    await screen.unmount();
  });

  it('hides every private field for a foreign assigned order', async () => {
    const screen = await render(
      <DriverOrderDetailScreen view={createDriverDetailFixture('D-DETAIL-PERMISSION')} />,
    );
    expect(screen.getByText('Bạn không có quyền xem đơn này')).toBeTruthy();
    expect(screen.queryByText('Kho riêng tư mô phỏng tại Quận 7')).toBeNull();
    expect(screen.queryByText('Ảnh xác nhận đã tải lên')).toBeNull();
    await screen.unmount();
  });
});
