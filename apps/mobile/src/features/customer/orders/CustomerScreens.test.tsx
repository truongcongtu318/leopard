import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render } from '@testing-library/react-native';

import {
  createCustomerCreateFixture,
  createCustomerDetailFixture,
  createCustomerListFixture,
} from './fixtures';
import { CustomerCreateOrderScreen } from './CustomerCreateOrderScreen';
import { CustomerOrderDetailScreen } from './CustomerOrderDetailScreen';
import { CustomerOrdersScreen } from './CustomerOrdersScreen';

describe('CustomerOrdersScreen', () => {
  it('renders a scannable list and delegates navigation, filters, and controlled loading', async () => {
    const onCreate = jest.fn();
    const onOpenOrder = jest.fn();
    const onSelectStatus = jest.fn();
    const onLoadMore = jest.fn();
    const screen = await render(
      <CustomerOrdersScreen
        onCreate={onCreate}
        onLoadMore={onLoadMore}
        onOpenOrder={onOpenOrder}
        onSelectStatus={onSelectStatus}
        view={createCustomerListFixture('C-LIST-SUCCESS')}
      />,
    );

    expect(screen.getByRole('header', { name: 'Đơn hàng của tôi' })).toBeTruthy();
    expect(screen.getByText('CUSTOMER · SỔ HÀNH TRÌNH')).toBeTruthy();
    expect(screen.getByText('Hành trình gần đây')).toBeTruthy();
    expect(screen.getByText('Đơn LP-260815-001')).toBeTruthy();
    expect(screen.getAllByText('ETA dự kiến')).toHaveLength(3);
    await fireEvent.press(screen.getByRole('button', { name: 'Tạo đơn mới' }));
    await fireEvent.press(screen.getByRole('button', { name: /Đơn LP-260815-001/ }));
    await fireEvent.press(screen.getByRole('button', { name: 'Đang vận chuyển' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Tải thêm đơn hàng' }));

    expect(onCreate).toHaveBeenCalledTimes(1);
    expect(onOpenOrder).toHaveBeenCalledWith('11111111-1111-4111-8111-111111111001');
    expect(onSelectStatus).toHaveBeenCalledWith('IN_TRANSIT');
    expect(onLoadMore).toHaveBeenCalledTimes(1);
    await screen.unmount();
  });

  it('replaces the private list with permission-denied content', async () => {
    const screen = await render(
      <CustomerOrdersScreen view={createCustomerListFixture('C-LIST-PERMISSION')} />,
    );

    expect(screen.getByText('Bạn không có quyền xem danh sách đơn này')).toBeTruthy();
    expect(screen.queryByText('Kho mô phỏng Quận 7')).toBeNull();
    await screen.unmount();
  });

  it('connects empty, no-results, and initial-error recovery actions', async () => {
    const onCreate = jest.fn();
    const onClearFilters = jest.fn();
    const onRetry = jest.fn();
    const empty = await render(
      <CustomerOrdersScreen onCreate={onCreate} view={createCustomerListFixture('C-LIST-EMPTY')} />,
    );
    await fireEvent.press(empty.getByRole('button', { name: 'Tạo đơn mới' }));
    expect(onCreate).toHaveBeenCalledTimes(1);
    await empty.unmount();

    const noResults = await render(
      <CustomerOrdersScreen
        onClearFilters={onClearFilters}
        view={createCustomerListFixture('C-LIST-NO-RESULTS')}
      />,
    );
    await fireEvent.press(noResults.getByRole('button', { name: 'Xóa bộ lọc' }));
    expect(onClearFilters).toHaveBeenCalledTimes(1);
    await noResults.unmount();

    const error = await render(
      <CustomerOrdersScreen onRetry={onRetry} view={createCustomerListFixture('C-LIST-ERROR')} />,
    );
    await fireEvent.press(error.getByRole('button', { name: 'Thử lại' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
    await error.unmount();
  });

  it('keeps current rows visible when loading the next page fails', async () => {
    const onLoadMore = jest.fn();
    const screen = await render(
      <CustomerOrdersScreen
        onLoadMore={onLoadMore}
        view={createCustomerListFixture('C-LIST-PAGE-ERROR')}
      />,
    );

    expect(screen.getByText(/Các đơn hiện có vẫn được giữ/)).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Thử tải thêm' }));
    expect(onLoadMore).toHaveBeenCalledTimes(1);
    await screen.unmount();
  });
});

describe('CustomerCreateOrderScreen', () => {
  it('renders the guided route, three stops, estimate, price, ETA, and demo source', async () => {
    const onPrimaryAction = jest.fn();
    const screen = await render(
      <CustomerCreateOrderScreen
        onPrimaryAction={onPrimaryAction}
        view={createCustomerCreateFixture('C-NEW-ESTIMATE-DEMO')}
      />,
    );

    expect(screen.getByRole('header', { name: 'Tạo đơn' })).toBeTruthy();
    expect(screen.getByText('01')).toBeTruthy();
    expect(screen.getByText('02')).toBeTruthy();
    expect(screen.getByText('03')).toBeTruthy();
    expect(screen.getByLabelText('Điểm lấy hàng')).toBeTruthy();
    expect(screen.getByLabelText('Điểm dừng 3')).toBeTruthy();
    expect(screen.getByLabelText('Điểm giao hàng')).toBeTruthy();
    expect(screen.getByText('Giá dự kiến')).toBeTruthy();
    expect(screen.getByText('286.000 ₫')).toBeTruthy();
    expect(screen.getByText('ETA dự kiến')).toBeTruthy();
    expect(screen.getByText('Dữ liệu mô phỏng')).toBeTruthy();

    await fireEvent.press(screen.getByRole('button', { name: 'Tạo đơn' }));
    expect(onPrimaryAction).toHaveBeenCalledTimes(1);
    await screen.unmount();
  });

  it('blocks duplicate submit while the static command is pending', async () => {
    const onPrimaryAction = jest.fn();
    const screen = await render(
      <CustomerCreateOrderScreen
        onPrimaryAction={onPrimaryAction}
        view={createCustomerCreateFixture('C-NEW-SUBMIT-PENDING')}
      />,
    );
    const submit = screen.getByRole('button', { name: 'Đang tạo đơn' });

    await fireEvent.press(submit);
    await fireEvent.press(submit);
    expect(submit.props.accessibilityState).toMatchObject({ busy: true, disabled: true });
    expect(onPrimaryAction).not.toHaveBeenCalled();
    await screen.unmount();
  });

  it('delegates field, stop, vehicle, and safe estimate-retry intents', async () => {
    const onFieldChange = jest.fn();
    const onRemoveStop = jest.fn();
    const onSelectVehicle = jest.fn();
    const onRetry = jest.fn();
    const screen = await render(
      <CustomerCreateOrderScreen
        onFieldChange={onFieldChange}
        onRemoveStop={onRemoveStop}
        onRetry={onRetry}
        onSelectVehicle={onSelectVehicle}
        view={createCustomerCreateFixture('C-NEW-ESTIMATE-ERROR')}
      />,
    );

    await fireEvent.changeText(screen.getByLabelText('Điểm lấy hàng'), 'Địa chỉ mới');
    await fireEvent.press(screen.getByRole('radio', { name: 'Xe tải' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Xóa điểm dừng 1' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Thử lại' }));

    expect(onFieldChange).toHaveBeenCalledWith('pickup', 'Địa chỉ mới');
    expect(onSelectVehicle).toHaveBeenCalledWith('TRUCK');
    expect(onRemoveStop).toHaveBeenCalledWith('draft-stop-1');
    expect(onRetry).toHaveBeenCalledTimes(1);
    await screen.unmount();
  });

  it('shows outdated and expired estimates without a stale usable amount', async () => {
    for (const scenario of ['C-NEW-ESTIMATE-OUTDATED', 'C-NEW-ESTIMATE-EXPIRED'] as const) {
      const screen = await render(
        <CustomerCreateOrderScreen view={createCustomerCreateFixture(scenario)} />,
      );
      expect(screen.queryByText('286.000 ₫')).toBeNull();
      expect(
        screen.getAllByText(/estimate cũ không còn dùng được|Estimate đã hết hiệu lực/).length,
      ).toBeGreaterThanOrEqual(1);
      await screen.unmount();
    }
  });

  it('replaces the private draft at the permission boundary', async () => {
    const screen = await render(
      <CustomerCreateOrderScreen view={createCustomerCreateFixture('C-NEW-PERMISSION')} />,
    );
    expect(screen.getByText('Bạn không có quyền tạo đơn')).toBeTruthy();
    expect(screen.queryByLabelText('Ghi chú hàng hóa')).toBeNull();
    await screen.unmount();
  });
});

describe('CustomerOrderDetailScreen', () => {
  it('renders route, tracking, Driver, payment, media, and status history', async () => {
    const screen = await render(
      <CustomerOrderDetailScreen view={createCustomerDetailFixture('C-DETAIL-SUCCESS')} />,
    );

    expect(screen.getByRole('header', { name: 'Đơn LP-260815-001' })).toBeTruthy();
    expect(screen.getByText('CUSTOMER · JOURNEY SHEET')).toBeTruthy();
    expect(screen.getByTestId('route-map-schematic')).toBeTruthy();
    expect(screen.getAllByText('Đang vận chuyển').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Tài xế Nguyễn Minh An').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByLabelText(/Bản đồ lộ trình/)).toBeTruthy();
    expect(screen.getByText('Thanh toán')).toBeTruthy();
    expect(screen.getByText('Ảnh hàng hóa')).toBeTruthy();
    expect(screen.getByText('Lịch sử trạng thái')).toBeTruthy();
    await screen.unmount();
  });

  it('renders an explicit QR-expired recovery without a payable QR payload', async () => {
    const onPaymentAction = jest.fn();
    const screen = await render(
      <CustomerOrderDetailScreen
        onPaymentAction={onPaymentAction}
        view={createCustomerDetailFixture('C-DETAIL-QR-EXPIRED')}
      />,
    );

    expect(screen.getByText('Mã QR đã hết hạn')).toBeTruthy();
    expect(screen.queryByText(/payos:\/\//i)).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: 'Tạo mã QR mới' }));
    expect(onPaymentAction).toHaveBeenCalledTimes(1);
    await screen.unmount();
  });

  it('does not mount private detail content for a foreign order', async () => {
    const screen = await render(
      <CustomerOrderDetailScreen view={createCustomerDetailFixture('C-DETAIL-PERMISSION')} />,
    );

    expect(screen.getByText('Bạn không có quyền xem đơn hàng này')).toBeTruthy();
    expect(screen.queryByText('Tài xế Nguyễn Minh An')).toBeNull();
    expect(screen.queryByText('Kho mô phỏng Quận 7')).toBeNull();
    await screen.unmount();
  });

  it('distinguishes no Driver, no location, stale tracking, and map fallback', async () => {
    const scenarios = [
      ['C-DETAIL-NO-DRIVER', 'Chưa có tài xế nhận đơn.'],
      ['C-DETAIL-NO-LOCATION', 'Chưa có vị trí tài xế.'],
      ['C-DETAIL-TRACKING-STALE', 'Vị trí chưa cập nhật; đang hiển thị điểm gần nhất.'],
      ['C-DETAIL-MAP-ERROR', 'Bản đồ chưa khả dụng'],
    ] as const;

    for (const [scenario, expected] of scenarios) {
      const screen = await render(
        <CustomerOrderDetailScreen view={createCustomerDetailFixture(scenario)} />,
      );
      expect(screen.getAllByText(expected).length).toBeGreaterThanOrEqual(1);
      await screen.unmount();
    }
  });

  it('delegates explicit cancel and map recovery callbacks without mutating fixtures', async () => {
    const onCancel = jest.fn();
    const cancel = await render(
      <CustomerOrderDetailScreen
        onCancel={onCancel}
        view={createCustomerDetailFixture('C-DETAIL-CANCEL-AVAILABLE')}
      />,
    );
    await fireEvent.press(cancel.getByRole('button', { name: 'Hủy đơn' }));
    expect(onCancel).toHaveBeenCalledWith('cancel-order');
    await cancel.unmount();

    const onRetry = jest.fn();
    const mapError = await render(
      <CustomerOrderDetailScreen
        onRetry={onRetry}
        view={createCustomerDetailFixture('C-DETAIL-MAP-ERROR')}
      />,
    );
    await fireEvent.press(mapError.getByRole('button', { name: 'Thử tải lại bản đồ' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
    await mapError.unmount();
  });

  it('blocks duplicate payment intent while the command is pending', async () => {
    const onPaymentAction = jest.fn();
    const screen = await render(
      <CustomerOrderDetailScreen
        onPaymentAction={onPaymentAction}
        view={createCustomerDetailFixture('C-DETAIL-PAYMENT-PENDING')}
      />,
    );
    const payment = screen.getByRole('button', { name: 'Đang tạo mã QR' });
    await fireEvent.press(payment);
    expect(payment.props.accessibilityState).toMatchObject({ busy: true, disabled: true });
    expect(onPaymentAction).not.toHaveBeenCalled();
    await screen.unmount();
  });
});
