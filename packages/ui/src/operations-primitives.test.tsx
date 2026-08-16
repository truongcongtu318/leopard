import { describe, expect, it } from '@jest/globals';
import { render, screen, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import React from 'react';

import { CompactMetricSummary } from './CompactMetricSummary';
import { FieldMapSchematic } from './FieldMapSchematic';
import { OperationalAlert } from './OperationalAlert';
import { OperationsPageHeader } from './OperationsPageHeader';
import { ReadOnlyDetailList } from './ReadOnlyDetailList';
import { ResponsiveResultList } from './ResponsiveResultList';
import { RouteMapSchematic } from './RouteMapSchematic';
import { RouteSpine } from './RouteSpine';
import { StatusTimeline } from './StatusTimeline';

describe('OperationsPageHeader', () => {
  it('renders one compact page heading with operational context and actions', () => {
    render(
      <OperationsPageHeader
        title="Đơn hàng vận hành"
        context="24 đơn trong phạm vi hiện tại"
        updatedAt={<time dateTime="2026-08-15T07:30:00Z">14:30, 15/08/2026</time>}
        actions={<button type="button">Làm mới dữ liệu</button>}
      />,
    );

    expect(
      screen.getByRole('heading', { level: 1, name: 'Đơn hàng vận hành' }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(screen.getByText('24 đơn trong phạm vi hiện tại')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Làm mới dữ liệu' })).toBeInTheDocument();
  });

  it('labels stale metadata without hiding the supplied timestamp', () => {
    render(
      <OperationsPageHeader
        title="Tổng quan đội xe"
        isStale
        updatedAt={<time dateTime="2026-08-15T07:00:00Z">14:00</time>}
      />,
    );

    expect(screen.getByText('Dữ liệu có thể đã cũ')).toBeInTheDocument();
    expect(screen.getByText('14:00')).toBeInTheDocument();
  });

  it('omits optional context, freshness metadata and actions cleanly', () => {
    render(<OperationsPageHeader title="Theo dõi vận hành" />);

    expect(
      screen.getByRole('heading', { level: 1, name: 'Theo dõi vận hành' }),
    ).toBeInTheDocument();
    expect(screen.queryByText(/Cập nhật:/)).not.toBeInTheDocument();
    expect(screen.queryByText('Dữ liệu có thể đã cũ')).not.toBeInTheDocument();
  });
});

describe('CompactMetricSummary', () => {
  const items = [
    { id: 'available', label: 'Tài xế sẵn sàng', value: 0 },
    {
      id: 'offline',
      label: 'Tài xế ngoại tuyến',
      value: 4,
      href: '/fleet/drivers?availability=OFFLINE',
      accessibleLabel: 'Xem 4 tài xế ngoại tuyến',
    },
  ] as const;

  it('uses a compact description list and keeps zero as valid data', () => {
    render(<CompactMetricSummary ariaLabel="Tóm tắt đội xe" items={items} />);

    const region = screen.getByRole('region', { name: 'Tóm tắt đội xe' });
    expect(region.querySelector('dl')).toBeInTheDocument();
    expect(screen.getByText('Tài xế sẵn sàng')).toBeInTheDocument();
    expect(screen.getByText('0')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Xem 4 tài xế ngoại tuyến' })).toHaveAttribute(
      'href',
      '/fleet/drivers?availability=OFFLINE',
    );
  });

  it('keeps its shape and stops decorative loading motion for reduced motion', () => {
    const { container } = render(
      <CompactMetricSummary ariaLabel="Tóm tắt đội xe" items={items} isLoading />,
    );

    expect(screen.getByRole('region', { name: 'Tóm tắt đội xe' })).toHaveAttribute(
      'aria-busy',
      'true',
    );
    expect(container.querySelectorAll('.animate-pulse')).toHaveLength(2);
    container.querySelectorAll('.animate-pulse').forEach((skeleton) => {
      expect(skeleton).toHaveClass('motion-reduce:animate-none');
    });
  });
});

describe('RouteSpine', () => {
  const origin = {
    id: 'origin',
    label: 'Kho đầu nguồn với tên rất dài cần xuống dòng an toàn',
  } as const;
  const destination = {
    id: 'destination',
    label: 'Điểm giao cuối tuyến',
  } as const;

  it('renders a semantic route with zero intermediate stops', () => {
    render(
      <RouteSpine
        ariaLabel="Tuyến giao hàng"
        origin={origin}
        stops={[]}
        destination={destination}
      />,
    );

    const route = screen.getByRole('list', { name: 'Tuyến giao hàng' });
    expect(within(route).getAllByRole('listitem')).toHaveLength(2);
    expect(screen.getByText('Điểm lấy')).toBeInTheDocument();
    expect(screen.getByText('Điểm giao')).toBeInTheDocument();
    expect(screen.queryByText(/Điểm dừng/)).not.toBeInTheDocument();
  });

  it('keeps all three ordered stops, long labels and current-leg text', () => {
    render(
      <RouteSpine
        ariaLabel="Tuyến có ba điểm dừng"
        origin={origin}
        stops={[
          { id: 's1', label: 'Điểm dừng thứ nhất' },
          {
            id: 's2',
            label: 'Điểm dừng thứ hai có địa chỉ dài để chứng minh nội dung không bị cắt',
          },
          { id: 's3', label: 'Điểm dừng thứ ba' },
        ]}
        destination={destination}
        currentLegIndex={2}
        variant="compact"
      />,
    );

    expect(screen.getAllByText(/Điểm dừng \d/)).toHaveLength(3);
    expect(screen.getByText('Chặng hiện tại')).toBeInTheDocument();
    expect(screen.getByText(/Điểm dừng thứ hai có địa chỉ dài/)).toHaveClass('break-words');
  });

  it('shows stale route context as text rather than color alone', () => {
    render(<RouteSpine origin={origin} stops={[]} destination={destination} isStale />);

    expect(screen.getByText('Dữ liệu tuyến có thể đã cũ')).toBeInTheDocument();
  });
});

describe('RouteMapSchematic', () => {
  it('renders a visible route signature and textual context without raw coordinates', () => {
    render(
      <RouteMapSchematic
        destinationLabel="Thành phố Thủ Đức"
        markerLabel="Tài xế gần điểm giao"
        originLabel="Quận 7"
      />,
    );

    expect(screen.getByTestId('route-map-schematic')).toBeInTheDocument();
    expect(screen.getByText('Quận 7')).toBeInTheDocument();
    expect(screen.getByText('Thành phố Thủ Đức')).toBeInTheDocument();
    expect(screen.getByText('Tài xế gần điểm giao')).toBeInTheDocument();
    expect(screen.queryByText(/10\.\d+,\s*106\.\d+/)).not.toBeInTheDocument();
  });
});

describe('FieldMapSchematic', () => {
  it('renders a distribution field with named markers and no invented route', () => {
    const { container } = render(
      <FieldMapSchematic fieldLabel="Đội xe Sao Mai" markerLabels={['Tài xế An', 'Tài xế Bình']} />,
    );

    expect(screen.getByText('Đội xe Sao Mai')).toBeInTheDocument();
    expect(screen.getByText('Tài xế An')).toBeInTheDocument();
    expect(screen.getByText('Tài xế Bình')).toBeInTheDocument();
    expect(container.querySelector('[data-route-path]')).not.toBeInTheDocument();
  });
});

describe('StatusTimeline', () => {
  it('renders lifecycle events as an ordered status timeline', () => {
    render(
      <StatusTimeline
        ariaLabel="Lịch sử trạng thái đơn"
        items={[
          {
            id: 'accepted',
            label: 'Đã nhận đơn',
            timestamp: '14:00, 15/08/2026',
            dateTime: '2026-08-15T07:00:00Z',
          },
          {
            id: 'transit',
            label: 'Đang vận chuyển',
            description: 'Tài xế đã rời điểm lấy',
            isCurrent: true,
          },
        ]}
      />,
    );

    const timeline = screen.getByRole('list', { name: 'Lịch sử trạng thái đơn' });
    expect(within(timeline).getAllByRole('listitem')).toHaveLength(2);
    expect(screen.getByText('Hiện tại')).toBeInTheDocument();
    expect(screen.getByText('14:00, 15/08/2026').closest('time')).toHaveAttribute(
      'datetime',
      '2026-08-15T07:00:00Z',
    );
  });

  it('supports audit-ready actor, reason, outcome and request ID fields', () => {
    render(
      <StatusTimeline
        ariaLabel="Nhật ký thao tác đặc quyền"
        variant="audit"
        items={[
          {
            id: 'audit-1',
            label: 'Đã xác nhận thanh toán thủ công',
            actor: 'Quản trị viên thử nghiệm',
            reason: 'Đối soát chứng từ',
            requestId: 'req-demo-001',
            outcome: 'Thành công',
          },
        ]}
      />,
    );

    expect(screen.getByText('Người thực hiện')).toBeInTheDocument();
    expect(screen.getByText('Quản trị viên thử nghiệm')).toBeInTheDocument();
    expect(screen.getByText('Lý do')).toBeInTheDocument();
    expect(screen.getByText('Mã yêu cầu')).toBeInTheDocument();
    expect(screen.getByText('Kết quả')).toBeInTheDocument();
  });
});

describe('ReadOnlyDetailList', () => {
  it('uses description-list semantics instead of disabled form controls', () => {
    const { container } = render(
      <ReadOnlyDetailList
        ariaLabel="Chi tiết chỉ xem"
        items={[
          { id: 'driver', label: 'Tài xế', value: 'Nguyễn An' },
          { id: 'tracking', label: 'Theo dõi', state: 'unavailable' },
          { id: 'phone', label: 'Số điện thoại', state: 'restricted' },
        ]}
      />,
    );

    expect(screen.getByRole('group', { name: 'Chi tiết chỉ xem' })).toBeInTheDocument();
    expect(container.querySelector('dl')).toBeInTheDocument();
    expect(container.querySelector('input, textarea, select')).not.toBeInTheDocument();
    expect(screen.getByText('Chưa có dữ liệu')).toBeInTheDocument();
    expect(screen.getByText('Thông tin bị giới hạn')).toBeInTheDocument();
  });
});

describe('OperationalAlert', () => {
  it('renders an assertive operational alert with a visible recovery action', () => {
    render(
      <OperationalAlert
        tone="danger"
        title="Hệ thống chưa sẵn sàng"
        live="assertive"
        actions={<button type="button">Kiểm tra lại</button>}
      >
        Không thể kết nối cơ sở dữ liệu.
      </OperationalAlert>,
    );

    expect(screen.getByRole('alert')).toHaveAttribute('aria-live', 'assertive');
    expect(screen.getByText('Hệ thống chưa sẵn sàng')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Kiểm tra lại' })).toBeInTheDocument();
  });

  it('keeps static notices quiet and exposes polite updates as status', () => {
    const { rerender } = render(
      <OperationalAlert title="Ghi chú vận hành">Dữ liệu chỉ dùng để tham khảo.</OperationalAlert>,
    );

    const quietNotice = screen.getByText('Ghi chú vận hành').closest('section');
    expect(quietNotice).not.toHaveAttribute('role');
    expect(quietNotice).not.toHaveAttribute('aria-live');

    rerender(
      <OperationalAlert title="Đã cập nhật" tone="success" live="polite">
        Danh sách mới đã sẵn sàng.
      </OperationalAlert>,
    );

    expect(screen.getByRole('status')).toHaveAttribute('aria-live', 'polite');
  });
});

describe('ResponsiveResultList', () => {
  it('provides a reusable mobile row-detail composition without business fields', () => {
    render(
      <ResponsiveResultList
        ariaLabel="Kết quả đơn hàng"
        items={[
          {
            id: 'order-1',
            heading: <a href="/orders/order-1">Đơn LP-0001</a>,
            status: <span>Đang vận chuyển</span>,
            details: [
              { id: 'route', label: 'Tuyến', value: 'Kho A → Kho B' },
              { id: 'updated', label: 'Cập nhật', value: '14:30' },
            ],
            actions: <button type="button">Hiển thị trên bản đồ</button>,
          },
        ]}
      />,
    );

    const list = screen.getByRole('list', { name: 'Kết quả đơn hàng' });
    expect(list).toHaveClass('md:hidden');
    expect(within(list).getByRole('article')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Đơn LP-0001' })).toBeInTheDocument();
    expect(screen.getByText('Tuyến')).toBeInTheDocument();
  });

  it('renders a textual empty state and supports rows without optional adornments', () => {
    const { rerender } = render(<ResponsiveResultList ariaLabel="Kết quả trống" items={[]} />);

    expect(screen.getByText('Chưa có kết quả để hiển thị.')).toBeInTheDocument();

    rerender(
      <ResponsiveResultList
        ariaLabel="Kết quả tối giản"
        items={[
          {
            id: 'result-1',
            heading: 'Kết quả 1',
            details: [],
          },
        ]}
      />,
    );

    expect(screen.getByRole('article')).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
