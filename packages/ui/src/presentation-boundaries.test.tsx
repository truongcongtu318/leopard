import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import React from 'react';

import { MapPanel } from './MapPanel';
import { Pagination } from './Pagination';
import { ExternalStatusBadge, StatusBadge, type StatusBadgeProps } from './StatusBadge';

describe('domain-discriminated StatusBadge', () => {
  it('maps the same ACTIVE value to distinct canonical Vietnamese domain labels', () => {
    const { rerender } = render(<StatusBadge domain="userStatus" status="ACTIVE" />);

    expect(screen.getByText('Đang hoạt động')).toBeInTheDocument();
    expect(screen.queryByText('Đang tham gia')).not.toBeInTheDocument();

    rerender(<StatusBadge domain="fleetMemberStatus" status="ACTIVE" />);

    expect(screen.getByText('Đang tham gia')).toBeInTheDocument();
    expect(screen.queryByText('Đang hoạt động')).not.toBeInTheDocument();
  });

  it('fails safely to a neutral visible label for unknown domain values', () => {
    render(<ExternalStatusBadge domain="userStatus" status="SUSPENDED_BY_PROVIDER" />);

    const badge = screen.getByText('Trạng thái chưa được hỗ trợ');
    expect(badge).toHaveClass('bg-neutral-surface', 'text-neutral-text', 'border-neutral-border');
    expect(badge).not.toHaveClass('bg-success', 'bg-active');
  });

  it('rejects invalid cross-domain pairs from the canonical prop union', () => {
    type InvalidPairIsAccepted =
      Readonly<{
        domain: 'paymentStatus';
        status: 'REQUESTED';
      }> extends StatusBadgeProps
        ? true
        : false;

    const invalidPairIsAccepted: InvalidPairIsAccepted = false;
    expect(invalidPairIsAccepted).toBe(false);
  });
});

describe('Vietnamese Pagination boundary', () => {
  it('announces current page, total pages and total results in Vietnamese', () => {
    render(<Pagination page={2} totalPages={5} totalItems={84} onPageChange={() => {}} />);

    expect(screen.getByRole('navigation', { name: 'Phân trang kết quả' })).toBeInTheDocument();
    expect(screen.getByText('Trang 2 trên 5 · 84 kết quả')).toHaveAttribute('aria-live', 'polite');
    expect(screen.getByRole('button', { name: 'Trang 2, trang hiện tại' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(screen.getByRole('button', { name: 'Đến trang 3' })).toBeInTheDocument();
  });

  it('gives every interactive pagination control a 44px target', () => {
    render(<Pagination page={4} totalPages={12} onPageChange={() => {}} />);

    screen.getAllByRole('button').forEach((button) => {
      expect(button).toHaveClass('min-h-11', 'min-w-11');
    });
  });

  it('does not emit out-of-range changes at either boundary', () => {
    const onPageChange = jest.fn();
    const { rerender } = render(<Pagination page={1} totalPages={3} onPageChange={onPageChange} />);

    fireEvent.click(screen.getByRole('button', { name: 'Về trang trước' }));
    expect(onPageChange).not.toHaveBeenCalled();

    rerender(<Pagination page={3} totalPages={3} onPageChange={onPageChange} />);
    fireEvent.click(screen.getByRole('button', { name: 'Đến trang sau' }));
    expect(onPageChange).not.toHaveBeenCalled();
  });
});

describe('MapPanel state and privacy boundary', () => {
  it('keeps a stable region and polite loading text without mounting map children', () => {
    render(
      <MapPanel state="loading">
        <div>Marker riêng tư LP-0001</div>
      </MapPanel>,
    );

    const panel = screen.getByRole('region', { name: 'Bản đồ tuyến đường' });
    expect(panel).toHaveClass('min-h-map-min', 'h-map-standard');
    expect(panel).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByRole('status')).toHaveTextContent('Đang tải bản đồ');
    expect(screen.queryByText('Marker riêng tư LP-0001')).not.toBeInTheDocument();
  });

  it('keeps last-known map context, timestamp and text alternative when stale', () => {
    render(
      <MapPanel
        state="stale"
        textAlternative="Vị trí cuối của tài xế tại Quận 7"
        lastUpdated={<time dateTime="2026-08-15T07:30:00Z">14:30, 15/08/2026</time>}
      >
        <div>Last-known map</div>
      </MapPanel>,
    );

    expect(screen.getByText('Last-known map')).toBeInTheDocument();
    expect(screen.getByText('Dữ liệu bản đồ có thể đã cũ')).toBeInTheDocument();
    expect(screen.getByText('Vị trí cuối của tài xế tại Quận 7')).toBeInTheDocument();
    expect(screen.getByText('14:30, 15/08/2026')).toBeInTheDocument();
  });

  it('shows no-location text and never creates a fake marker', () => {
    render(
      <MapPanel
        state="no-location"
        textAlternative="Tuyến Kho A đến Kho B vẫn có thể đọc bằng văn bản"
      >
        <div>Fake marker at 0,0</div>
      </MapPanel>,
    );

    expect(screen.getByText('Chưa có vị trí hợp lệ.')).toBeInTheDocument();
    expect(screen.queryByText('Fake marker at 0,0')).not.toBeInTheDocument();
    expect(
      screen.getByText('Tuyến Kho A đến Kho B vẫn có thể đọc bằng văn bản'),
    ).toBeInTheDocument();
  });

  it('keeps textual context and offers a safe isolated retry when unavailable', () => {
    const onRetry = jest.fn();
    render(
      <MapPanel
        state="unavailable"
        textAlternative="Danh sách có 12 trên 20 kết quả có vị trí"
        onRetry={onRetry}
      />,
    );

    expect(
      screen.getByText(
        'Bản đồ tạm thời không khả dụng. Danh sách và thông tin vị trí vẫn được giữ.',
      ),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Thử tải lại bản đồ' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('does not mount private map descendants or alternatives when permission is denied', () => {
    render(
      <MapPanel state="permission-denied" textAlternative="Tọa độ riêng tư của đơn LP-PRIVATE-001">
        <div>Marker riêng tư LP-PRIVATE-001</div>
      </MapPanel>,
    );

    expect(screen.getByText('Bạn không có quyền xem dữ liệu bản đồ này.')).toBeInTheDocument();
    expect(screen.queryByText('Tọa độ riêng tư của đơn LP-PRIVATE-001')).not.toBeInTheDocument();
    expect(screen.queryByText('Marker riêng tư LP-PRIVATE-001')).not.toBeInTheDocument();
  });
});
