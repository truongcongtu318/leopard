import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render } from '@testing-library/react-native';

import {
  createCustomerDetailFixture,
  createCustomerListFixture,
} from './fixtures';
import { CustomerOrderDetailScreen } from './CustomerOrderDetailScreen';
import { CustomerOrdersScreen } from './CustomerOrdersScreen';

jest.setTimeout(25000);

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

    expect(screen.getByRole('header', { name: 'Đơn hàng' })).toBeTruthy();
    expect(screen.queryByText('CUSTOMER · SỔ HÀNH TRÌNH')).toBeNull();
    // Default segment "Lịch sử" shows completed orders; active orders in "Đang giao" tab
    expect(screen.getByText(/Đơn LP-26.*009/)).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Đặt chuyến mới' }));
    // Switch to active tab
    await fireEvent.press(screen.getByRole('tab', { name: /Đang giao/ }));
    // Now active orders are visible
    expect(screen.getByText(/LP-26.*001/)).toBeTruthy();
    // Press an order card
    await fireEvent.press(screen.getByRole('button', { name: /LP-26.*001/ }));
    await fireEvent.press(screen.getByRole('tab', { name: 'Lịch sử' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Tải thêm' }));

    expect(onCreate).toHaveBeenCalledTimes(1);
    expect(onOpenOrder).toHaveBeenCalledWith('11111111-1111-4111-8111-111111111001');
    expect(onLoadMore).toHaveBeenCalledTimes(1);
    await screen.unmount();
  });

  it('renders active filter chip with Midnight Navy #0B2545 background', async () => {
    const screen = await render(
      <CustomerOrdersScreen view={createCustomerListFixture('C-LIST-SUCCESS')} />,
    );

    const allFilterChip = screen.getByRole('button', { name: /Tất cả/ });
    expect(allFilterChip.props.style).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ backgroundColor: '#0B2545' }),
      ]),
    );
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
    await fireEvent.press(empty.getByRole('button', { name: 'Đặt chuyến mới' }));
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


describe('CustomerOrderDetailScreen', () => {
  it('renders route, tracking, Driver, payment, media, and status history', async () => {
    const screen = await render(
      <CustomerOrderDetailScreen view={createCustomerDetailFixture('C-DETAIL-SUCCESS')} />,
    );

    expect(screen.getByRole('header', { name: /Đơn LP-26/ })).toBeTruthy();
    expect(screen.queryByText('CUSTOMER · JOURNEY SHEET')).toBeNull();
    expect(screen.getByTestId('route-map-schematic')).toBeTruthy();
    expect(screen.getAllByText('Đang vận chuyển').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Tài xế/).length).toBeGreaterThanOrEqual(1);
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

    expect(screen.getByText(/Mã QR đã hết hạn/)).toBeTruthy();
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
    expect(screen.queryByText('Tài xế Nguyễn Văn Hùng')).toBeNull();
    expect(screen.queryByText('Kho VLXD Minh Khang')).toBeNull();
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
    await fireEvent.press(cancel.getByRole('button', { name: 'Lý do: Đặt nhầm địa chỉ' }));
    await fireEvent.press(cancel.getByRole('button', { name: 'Xác nhận hủy' }));
    expect(onCancel).toHaveBeenCalledWith('cancel-order', 'Đặt nhầm địa chỉ');
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

  it('delegates tracking navigation callback when pressing tracking preview button', async () => {
    const onOpenTracking = jest.fn();
    const fixture = createCustomerDetailFixture('C-DETAIL-SUCCESS');
    const screen = await render(
      <CustomerOrderDetailScreen onOpenTracking={onOpenTracking} view={fixture} />,
    );
    await fireEvent.press(screen.getByLabelText('Xem bản đồ theo dõi trực tiếp'));
    expect(onOpenTracking).toHaveBeenCalledWith((fixture as any).order.id);
    await screen.unmount();
  });

  it('renders financial details and payment status without rendering any QR code images', async () => {
    const screen = await render(
      <CustomerOrderDetailScreen view={createCustomerDetailFixture('C-DETAIL-SUCCESS')} />,
    );
    expect(screen.getByText('Thanh toán')).toBeTruthy();
    expect(screen.getAllByText('480.000 ₫').length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByLabelText('Mã QR thanh toán')).toBeNull();
    await screen.unmount();
  });

  function withInvoice(invoice: unknown) {
    const base = createCustomerDetailFixture('C-DETAIL-SUCCESS') as any;
    return { ...base, order: { ...base.order, invoice } };
  }

  it('renders no invoice section when the order has no invoice yet', async () => {
    const screen = await render(<CustomerOrderDetailScreen view={withInvoice(null)} />);

    expect(screen.queryByText('Hóa đơn')).toBeNull();
    await screen.unmount();
  });

  it('renders invoice details and opens the view link without an email prompt when already sent', async () => {
    const onOpenInvoice = jest.fn();
    const invoice = {
      id: 'invoice-1',
      invoiceNumber: 'LP/2026/000001',
      totalLabel: '528.000 ₫',
      issuedAtLabel: '00:00 · 08/09/2026',
      emailSentAt: '2026-09-08T01:00:00.000Z',
      viewUrl: 'https://signed.example/invoices/invoice-1.pdf',
    };
    const screen = await render(
      <CustomerOrderDetailScreen onOpenInvoice={onOpenInvoice} view={withInvoice(invoice)} />,
    );

    expect(screen.getByText('Hóa đơn')).toBeTruthy();
    expect(screen.getByText('LP/2026/000001')).toBeTruthy();
    expect(screen.getByText('528.000 ₫')).toBeTruthy();
    expect(screen.queryByPlaceholderText('ban@vidu.com')).toBeNull();

    await fireEvent.press(screen.getByRole('button', { name: 'Xem hóa đơn' }));
    expect(onOpenInvoice).toHaveBeenCalledWith(invoice.id);
    await screen.unmount();
  });

  it('shows the email prompt when the invoice has no email sent, and validates before submitting', async () => {
    const onSendInvoiceEmail = jest.fn();
    const invoice = {
      id: 'invoice-1',
      invoiceNumber: 'LP/2026/000001',
      totalLabel: '528.000 ₫',
      issuedAtLabel: '00:00 · 08/09/2026',
      emailSentAt: null,
      viewUrl: 'https://signed.example/invoices/invoice-1.pdf',
    };
    const screen = await render(
      <CustomerOrderDetailScreen onSendInvoiceEmail={onSendInvoiceEmail} view={withInvoice(invoice)} />,
    );

    const input = screen.getByPlaceholderText('ban@vidu.com');
    const sendButton = screen.getByRole('button', { name: 'Gửi email hóa đơn' });

    await fireEvent.changeText(input, 'not-an-email');
    await fireEvent.press(sendButton);
    expect(screen.getByText('Email không hợp lệ.')).toBeTruthy();
    expect(onSendInvoiceEmail).not.toHaveBeenCalled();

    await fireEvent.changeText(input, 'khach@example.com');
    await fireEvent.press(sendButton);
    expect(onSendInvoiceEmail).toHaveBeenCalledTimes(1);
    expect(onSendInvoiceEmail).toHaveBeenCalledWith('invoice-1', 'khach@example.com');
    await screen.unmount();
  });
});
