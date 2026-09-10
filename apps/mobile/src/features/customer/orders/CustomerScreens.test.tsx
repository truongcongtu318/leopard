import { useState } from 'react';
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
import type { LatLng } from './model';

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

    expect(screen.getByRole('header', { name: 'Đơn hàng của tôi' })).toBeTruthy();
    expect(screen.queryByText('CUSTOMER · SỔ HÀNH TRÌNH')).toBeNull();
    expect(screen.getByText('Hành trình gần đây')).toBeTruthy();
    expect(screen.getByText(/Đơn LP-26.*001/)).toBeTruthy();
    expect(screen.getAllByText('Thời gian dự kiến')).toHaveLength(3);
    await fireEvent.press(screen.getByRole('button', { name: 'Tạo đơn mới' }));
    await fireEvent.press(screen.getByRole('button', { name: /Đơn LP-26.*001/ }));
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
  it('renders the guided route, three stops, estimate, price, ETA, and demo source across 4 stages', async () => {
    const onPrimaryAction = jest.fn();
    const screen = await render(
      <CustomerCreateOrderScreen
        onPrimaryAction={onPrimaryAction}
        view={createCustomerCreateFixture('C-NEW-ESTIMATE-DEMO')}
      />,
    );

    expect(screen.getByRole('header', { name: 'Tạo đơn' })).toBeTruthy();
    expect(screen.getByText('1. Lộ trình')).toBeTruthy();
    expect(screen.getByText('2. Xe & Hàng')).toBeTruthy();
    expect(screen.getByText('3. Báo giá')).toBeTruthy();
    expect(screen.getByText('4. Xác nhận')).toBeTruthy();

    // Stage 1: Route & Stops
    await fireEvent.press(screen.getByRole('button', { name: 'Bước 1: Lộ trình' }));
    expect(screen.getByText('01')).toBeTruthy();
    expect(screen.getByLabelText('Điểm lấy hàng')).toBeTruthy();
    expect(screen.getByLabelText('Điểm dừng 3')).toBeTruthy();
    expect(screen.getByLabelText('Điểm giao hàng')).toBeTruthy();

    // Stage 3: Estimate, Price, ETA
    await fireEvent.press(screen.getByRole('button', { name: 'Bước 3: Báo giá' }));
    expect(screen.getByText('03')).toBeTruthy();
    expect(screen.getByText('Giá dự kiến')).toBeTruthy();
    expect(screen.getByText('286.000 ₫')).toBeTruthy();
    expect(screen.getByText('Thời gian dự kiến')).toBeTruthy();
    expect(screen.getByText('Ước tính tiêu chuẩn')).toBeTruthy();

    // Stage 4: Review and Submit Order
    await fireEvent.press(screen.getByRole('button', { name: 'Bước 4: Xác nhận' }));
    expect(screen.getByText('04')).toBeTruthy();
    expect(screen.getByText('KIỂM TRA & XÁC NHẬN')).toBeTruthy();

    await fireEvent.press(screen.getByRole('button', { name: 'Tạo đơn' }));
    expect(onPrimaryAction).toHaveBeenCalledTimes(1);
    await screen.unmount();
  });

  it('renders only the single optimal route without multiple choices', async () => {
    const onSelectRoute = jest.fn();
    const baseView = createCustomerCreateFixture('C-NEW-ESTIMATE-READY');
    const multiRouteView =
      baseView.kind === 'form' && baseView.estimate.kind === 'ready'
        ? {
            ...baseView,
            estimate: {
              ...baseView.estimate,
              routes: [
                ...baseView.estimate.routes,
                {
                  routeId: 'route-1',
                  estimateToken: 'demo-estimate-token-1',
                  isRecommended: false,
                  durationSeconds: 1320,
                  distanceLabel: '20,1 km',
                  priceLabel: '312.000 ₫',
                  congestionLevel: 'heavy' as const,
                  congestionLabel: 'Kẹt xe',
                },
              ],
            },
          }
        : baseView;

    const screen = await render(
      <CustomerCreateOrderScreen onSelectRoute={onSelectRoute} view={multiRouteView} />,
    );

    // Only the single optimal recommended route is shown
    expect(screen.getByText('⭐ Đề xuất')).toBeTruthy();
    expect(screen.getByText('286.000 ₫')).toBeTruthy();
    // Second route is not rendered as per design (chỉ cần hiện 1 tuyến thôi)
    expect(screen.queryByText('312.000 ₫')).toBeNull();
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

    // Stage 1: Update pickup text and remove stop
    await fireEvent.press(screen.getByRole('button', { name: 'Bước 1: Lộ trình' }));
    await fireEvent.changeText(screen.getByLabelText('Điểm lấy hàng'), 'Địa chỉ mới');
    await fireEvent.press(screen.getByRole('button', { name: 'Xóa điểm dừng 1' }));

    // Stage 2: Pick vehicle
    await fireEvent.press(screen.getByRole('button', { name: 'Bước 2: Xe & Hàng' }));
    await fireEvent.press(screen.getByRole('radio', { name: 'Xe tải nặng' }));

    // Stage 3: Retry estimate
    await fireEvent.press(screen.getByRole('button', { name: 'Bước 3: Báo giá' }));
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

  it('guides the customer step-by-step through the 3 stages with Next and Back buttons', async () => {
    const onPrimaryAction = jest.fn();
    const screen = await render(
      <CustomerCreateOrderScreen
        onPrimaryAction={onPrimaryAction}
        view={createCustomerCreateFixture('C-NEW-READY')}
      />,
    );

    // Initial is Stage 1
    expect(screen.getByText('LỘ TRÌNH VẬN CHUYỂN')).toBeTruthy();
    expect(screen.queryByText('PHƯƠNG TIỆN & HÀNG HÓA')).toBeNull();

    // Next button is disabled because pickup & dropoff are empty in C-NEW-READY
    const nextBtn = screen.getByRole('button', { name: /Tiếp tục: Chọn xe/ });
    expect(nextBtn.props.accessibilityState).toMatchObject({ disabled: true });
    await screen.unmount();
  });

  it('applies receiver info from modal to Step 1 and does not keep modal open', async () => {
    function TestWrapper() {
      const [view, setView] = useState(() => createCustomerCreateFixture('C-NEW-READY'));
      if (view.kind !== 'form') return null;

      const handleConfirmContactDetails = (
        target: 'pickup' | 'dropoff',
        details: { name: string; phone: string; note: string; address?: string; coords?: LatLng },
      ) => {
        if (target === 'dropoff') {
          setView((prev) => {
            if (prev.kind !== 'form') return prev;
            return {
              ...prev,
              form: {
                ...prev.form,
                dropoff: details.address ?? prev.form.dropoff,
                receiverInfo: { name: details.name, phone: details.phone, note: details.note },
              },
            };
          });
        }
      };

      return (
        <CustomerCreateOrderScreen
          onConfirmContactDetails={handleConfirmContactDetails}
          view={view}
        />
      );
    }

    const screen = await render(<TestWrapper />);

    // Tap on dropoff pin button or card
    await fireEvent.press(screen.getByLabelText('Xác nhận người nhận & vị trí giao'));

    // Modal is shown with header "Thông tin người nhận"
    expect(screen.getByText('Thông tin người nhận')).toBeTruthy();

    // Fill in receiver details
    const nameInput = screen.getByLabelText('Tên người nhận');
    const phoneInput = screen.getByLabelText('Số điện thoại');
    await fireEvent.changeText(nameInput, 'Chị Hoa');
    await fireEvent.changeText(phoneInput, '0911223344');

    // Click "Lưu thông tin vị trí"
    await fireEvent.press(screen.getByLabelText('Lưu thông tin vị trí'));

    // Modal is closed (not stuck open)
    expect(screen.queryByText('Thông tin người nhận')).toBeNull();

    // Step 1 displays the updated receiver contact badge
    expect(screen.getByText('Chị Hoa (0911223344)')).toBeTruthy();

    await screen.unmount();
  });

  it('supports custom category, dimension presets, and updated vehicle types in Step 2', async () => {
    const onSelectCategory = jest.fn();
    const onSelectVehicle = jest.fn();
    const onFieldChange = jest.fn();

    const screen = await render(
      <CustomerCreateOrderScreen
        onFieldChange={onFieldChange}
        onSelectCategory={onSelectCategory}
        onSelectVehicle={onSelectVehicle}
        step={2}
        view={createCustomerCreateFixture('C-NEW-READY')}
      />,
    );

    // Verify vehicle types: Xe ba gác, Xe tải nhẹ, Xe tải nặng
    expect(screen.getByRole('radio', { name: 'Xe ba gác' })).toBeTruthy();
    expect(screen.getByRole('radio', { name: 'Xe tải nhẹ' })).toBeTruthy();
    expect(screen.getByRole('radio', { name: 'Xe tải nặng' })).toBeTruthy();

    await fireEvent.press(screen.getByRole('radio', { name: 'Xe ba gác' }));
    expect(onSelectVehicle).toHaveBeenCalledWith('MOTORBIKE');

    // Dimension presets
    await fireEvent.press(screen.getByLabelText('Chọn quy cách Gói nhỏ (< 0.5 m³)'));
    expect(onFieldChange).toHaveBeenCalledWith('dimLength', '40');
    expect(onFieldChange).toHaveBeenCalledWith('dimWidth', '30');
    expect(onFieldChange).toHaveBeenCalledWith('dimHeight', '30');

    // Custom category input when 'Khác' is selected
    expect(screen.queryByLabelText('Chi tiết loại hàng khác')).toBeNull();
    await fireEvent.press(screen.getByLabelText('Chọn phân loại Khác'));
    expect(onSelectCategory).toHaveBeenCalledWith('Khác');

    await screen.unmount();
  });

  it('renders comprehensive Step 4 confirmation manifest with timeline, cargo specs, invoice, payment options, and trust badge', async () => {
    const onSelectPaymentMethod = jest.fn();
    const onPrimaryAction = jest.fn();
    const baseFixture = createCustomerCreateFixture('C-NEW-ESTIMATE-READY');

    const screen = await render(
      <CustomerCreateOrderScreen
        onPrimaryAction={onPrimaryAction}
        onSelectPaymentMethod={onSelectPaymentMethod}
        step={4}
        view={baseFixture}
      />,
    );

    // Header check
    expect(screen.getByText('04')).toBeTruthy();
    expect(screen.getByText('KIỂM TRA & XÁC NHẬN')).toBeTruthy();

    // Section 1: Route timeline & edit link
    expect(screen.getByText('LỘ TRÌNH VẬN CHUYỂN')).toBeTruthy();
    expect(screen.getByLabelText('Sửa thông tin lộ trình')).toBeTruthy();
    expect(screen.getByText('Lấy hàng tại:')).toBeTruthy();
    expect(screen.getByText(/Kho Tổng VLXD Minh Khang/)).toBeTruthy();
    expect(screen.getByText('Giao hàng đến:')).toBeTruthy();
    expect(screen.getByText(/Công trình Biệt thự Kim Long/)).toBeTruthy();

    // Section 2: Vehicle & Cargo manifest
    expect(screen.getByText('HÀNG HÓA & PHƯƠNG TIỆN')).toBeTruthy();
    expect(screen.getByLabelText('Sửa hàng hóa và phương tiện')).toBeTruthy();
    expect(screen.getByText('Xe tải nhẹ')).toBeTruthy();
    expect(screen.getByText('Khối lượng')).toBeTruthy();
    expect(screen.getByText('120 kg')).toBeTruthy();
    expect(screen.getByText('Kích thước')).toBeTruthy();
    expect(screen.getByText('Thể tích')).toBeTruthy();
    expect(screen.getByText('Bốc xếp hai đầu:')).toBeTruthy();

    // Section 3: Pricing & invoice
    expect(screen.getByText('CƯỚC PHÍ THANH TOÁN')).toBeTruthy();
    expect(screen.getByLabelText('Xem chi tiết giá')).toBeTruthy();
    expect(screen.getByText('Cước vận chuyển cơ bản')).toBeTruthy();
    expect(screen.getByText(/Cước quãng đường/)).toBeTruthy();
    expect(screen.getByText('Tổng thanh toán:')).toBeTruthy();
    expect(screen.getByText('286.000 ₫')).toBeTruthy();

    // Section 4: Payment methods
    const vietqrOption = screen.getByRole('radio', { name: 'Thanh toán qua VietQR' });
    const cashOption = screen.getByRole('radio', { name: 'Thanh toán Tiền mặt' });
    expect(vietqrOption).toBeTruthy();
    expect(cashOption).toBeTruthy();
    expect(screen.getByText('Khuyên dùng')).toBeTruthy();

    await fireEvent.press(cashOption);
    expect(onSelectPaymentMethod).toHaveBeenCalledWith('CASH');

    // Section 5: Trust badge
    expect(screen.getByText('Bảo hiểm vận chuyển LEOPARD')).toBeTruthy();

    // Primary action button
    const submitBtn = screen.getByRole('button', { name: 'Tạo đơn' });
    await fireEvent.press(submitBtn);
    expect(onPrimaryAction).toHaveBeenCalledWith('create-order');

    await screen.unmount();
  });

  it('opens VietQRPaymentModal on submit with VietQR, allows copying bank info, and transitions to Step 5', async () => {
    const onPrimaryAction = jest.fn();
    const baseFixture = createCustomerCreateFixture('C-NEW-ESTIMATE-READY');

    const screen = await render(
      <CustomerCreateOrderScreen
        onPrimaryAction={onPrimaryAction}
        step={4}
        view={baseFixture}
      />,
    );

    // Press "Tạo đơn"
    const submitBtn = screen.getByRole('button', { name: 'Tạo đơn' });
    await fireEvent.press(submitBtn);

    expect(onPrimaryAction).toHaveBeenCalledWith('create-order');

    // VietQR Modal is visible
    expect(screen.getByText('Thanh toán VietQR')).toBeTruthy();
    expect(screen.getByText('Quét mã qua app ngân hàng hoặc ví điện tử')).toBeTruthy();
    expect(screen.getByText('0383188888')).toBeTruthy();
    expect(screen.getByText('CONG TY CO PHAN LEOPARD LOGISTICS')).toBeTruthy();
    expect(screen.getByLabelText('Sao chép số tài khoản')).toBeTruthy();
    expect(screen.getByLabelText('Sao chép nội dung chuyển khoản')).toBeTruthy();

    // Copy action
    await fireEvent.press(screen.getByLabelText('Sao chép số tài khoản'));
    expect(screen.getByText('Đã chép')).toBeTruthy();

    // Press "Tôi đã chuyển khoản ➔"
    await fireEvent.press(screen.getByRole('button', { name: 'Tôi đã chuyển khoản ➔' }));

    // Congratulation state
    expect(screen.getByText('Thanh toán thành công!')).toBeTruthy();

    await screen.unmount();
  });

  it('renders Step 5 Finding Driver screen with live radar, nearby drivers count, search timer, cancel modal, and driver matching', async () => {
    const onViewCreatedOrder = jest.fn();
    const onCancelOrder = jest.fn();
    const baseFixture = createCustomerCreateFixture('C-NEW-ESTIMATE-READY');

    const screen = await render(
      <CustomerCreateOrderScreen
        onCancelOrder={onCancelOrder}
        onViewCreatedOrder={onViewCreatedOrder}
        step={5}
        view={baseFixture}
      />,
    );

    // Step 5 Title & Radar Elements
    expect(screen.getByText('Đang tìm tài xế gần bạn nhất...')).toBeTruthy();
    expect(screen.getByText(/3 tài xế đang hoạt động gần bạn/)).toBeTruthy();
    expect(screen.getByText('Thời gian tìm kiếm:')).toBeTruthy();

    // Route & Vehicle manifest summary
    expect(screen.getByText('MÃ ĐƠN HÀNG')).toBeTruthy();
    expect(screen.getByText(/Kho Tổng VLXD Minh Khang/)).toBeTruthy();
    expect(screen.getByText(/Công trình Biệt thự Kim Long/)).toBeTruthy();

    // Cancel search modal flow
    await fireEvent.press(screen.getByRole('button', { name: '✕ Hủy tìm kiếm' }));
    expect(screen.getByText('Hủy tìm kiếm tài xế?')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Xác nhận hủy tìm kiếm' }));
    expect(onCancelOrder).toHaveBeenCalledTimes(1);

    // Detail button
    await fireEvent.press(screen.getByRole('button', { name: 'Chi tiết đơn hàng ➔' }));
    expect(onViewCreatedOrder).toHaveBeenCalledTimes(1);

    // Simulate driver matching (Pilot/Demo)
    await fireEvent.press(screen.getByRole('button', { name: 'Mô phỏng tài xế nhận chuyến' }));
    expect(screen.getByText('TÀI XẾ ĐÃ NHẬN CHUYẾN')).toBeTruthy();
    expect(screen.getByText('Nguyễn Văn Hùng')).toBeTruthy();
    expect(screen.getByText('51C-892.45')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Theo dõi hành trình tài xế ➔' })).toBeTruthy();

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
