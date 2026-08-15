import { describe, expect, it } from '@jest/globals';
import { render, screen } from '@testing-library/react';

import { FleetDashboardScreen } from './FleetDashboardScreen';
import { FleetDriversScreen } from './FleetDriversScreen';
import { FleetOrderDetailScreen } from './FleetOrderDetailScreen';
import { FleetOrdersScreen } from './FleetOrdersScreen';
import { FleetPaginationLinks } from './FleetShared';
import { createFleetPreviewView } from './fixtures';

const forbiddenMutations = [
  'Tạo đơn',
  'Hủy đơn',
  'Nhận đơn',
  'Cập nhật trạng thái',
  'Xác nhận thanh toán',
  'Mời tài xế',
  'Gỡ tài xế',
  'Tải ảnh lên',
];

function expectReadOnlySurface() {
  expect(screen.getByLabelText('Phạm vi truy cập đội xe')).toBeTruthy();
  expect(screen.getByText('Phạm vi truy cập: Đội xe Sao Mai')).toBeTruthy();
  expect(screen.getByText(/Tư cách thành viên: Đang tham gia · Chỉ xem/)).toBeTruthy();
  for (const label of forbiddenMutations) {
    expect(screen.queryByRole('button', { name: label })).toBeNull();
    expect(screen.queryByRole('link', { name: label })).toBeNull();
  }
}

describe('Fleet Owner static screens', () => {
  it('renders an exception-first dashboard with valid zero metrics', () => {
    render(
      <FleetDashboardScreen view={createFleetPreviewView('dashboard', 'fleet-overview-success')} />,
    );

    expectReadOnlySurface();
    expect(screen.getByRole('heading', { name: 'Tổng quan đội xe' })).toBeTruthy();
    expect(screen.getByText('Cần chú ý')).toBeTruthy();
    expect(screen.getByText('0')).toBeTruthy();
    expect(screen.getByText('LP-F-260815-001')).toBeTruthy();
  });

  it('renders Driver table, responsive rows, URL-shaped filters and map fallback', () => {
    render(
      <FleetDriversScreen
        previewContext={{ preview: 'enabled', scenario: 'fleet-drivers-map-unavailable' }}
        view={createFleetPreviewView('drivers', 'fleet-drivers-map-unavailable')}
      />,
    );

    expectReadOnlySurface();
    expect(screen.getByRole('search', { name: 'Lọc tài xế' })).toBeTruthy();
    expect(screen.getAllByText('Tài xế An Mô Phỏng').length).toBeGreaterThan(1);
    expect(screen.getByText(/Bản đồ tạm thời không khả dụng/)).toBeTruthy();
    expect(screen.getByLabelText('Thông tin thay thế cho bản đồ').textContent).toContain(
      '2 tài xế trong kết quả',
    );
  });

  it('renders Order filters, status/payment semantics and detail links', () => {
    render(
      <FleetOrdersScreen
        previewContext={{ preview: 'enabled', scenario: 'fleet-orders-mixed' }}
        view={createFleetPreviewView('orders', 'fleet-orders-mixed')}
      />,
    );

    expectReadOnlySurface();
    expect(screen.getByRole('search', { name: 'Lọc đơn của đội xe' })).toBeTruthy();
    expect(screen.getAllByText('LP-F-260815-001').length).toBeGreaterThan(1);
    expect(screen.getAllByText('Đang vận chuyển').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Chưa thanh toán').length).toBeGreaterThan(0);
    expect(screen.getAllByRole('link', { name: /Xem đơn LP-F-260815-001/ }).length).toBeGreaterThan(
      0,
    );
  });

  it('renders a private-safe read-only order detail with ETA and demo provenance', () => {
    render(
      <FleetOrderDetailScreen
        view={createFleetPreviewView('order-detail', 'fleet-order-detail-success')}
      />,
    );

    expectReadOnlySurface();
    expect(screen.getByRole('heading', { name: 'Đơn LP-F-260815-001' })).toBeTruthy();
    expect(screen.getByText(/Bạn đang xem dữ liệu ở chế độ chỉ xem/)).toBeTruthy();
    expect(screen.getByText(/ETA dự kiến/)).toBeTruthy();
    expect(screen.getByText(/Dữ liệu mô phỏng/)).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Lịch sử trạng thái' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Thanh toán' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Media' })).toBeTruthy();
  });

  it('never leaks private order or scope data in a foreign-resource denial', () => {
    render(
      <FleetOrderDetailScreen
        view={createFleetPreviewView('order-detail', 'fleet-order-foreign-denied')}
      />,
    );

    expect(screen.getByRole('alert')).toBeTruthy();
    expect(screen.getByText('Bạn không có quyền xem đơn này')).toBeTruthy();
    expect(screen.queryByText(/Sao Mai/)).toBeNull();
    expect(screen.queryByText(/LP-F-/)).toBeNull();
    expect(screen.queryByText('Thanh toán')).toBeNull();
  });

  it.each([
    ['fleet-overview-empty', 'Chưa có ngoại lệ cần xử lý'],
    ['fleet-overview-partial-error', 'Không thể tải vùng dữ liệu'],
    ['fleet-reconnecting', 'Đang kết nối lại'],
    ['fleet-refresh-success', 'Đã làm mới snapshot'],
  ])('renders dashboard scenario %s without inventing mutations', (scenarioId, expectedCopy) => {
    render(<FleetDashboardScreen view={createFleetPreviewView('dashboard', scenarioId)} />);
    expectReadOnlySurface();
    expect(screen.getByText(new RegExp(expectedCopy))).toBeTruthy();
  });

  it.each([
    ['fleet-scope-loading', 'Đang xác nhận phạm vi đội xe'],
    ['fleet-scope-denied', 'Bạn không có quyền xem đội xe này'],
    ['fleet-session-expired', 'Phiên làm việc đã hết hạn'],
  ])('suppresses scope data for dashboard boundary %s', (scenarioId, expectedCopy) => {
    render(<FleetDashboardScreen view={createFleetPreviewView('dashboard', scenarioId)} />);
    expect(screen.getByText(expectedCopy)).toBeTruthy();
    expect(screen.queryByText(/Sao Mai/)).toBeNull();
  });

  it('renders no-results while preserving Driver filter recovery', () => {
    render(
      <FleetDriversScreen view={createFleetPreviewView('drivers', 'fleet-drivers-no-results')} />,
    );
    expect(screen.getByText('Không tìm thấy tài xế')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Xóa bộ lọc' })).toBeTruthy();
    expect(screen.getByText('Chưa có vị trí hợp lệ.')).toBeTruthy();
  });

  it.each([
    ['fleet-orders-no-results', 'Không tìm thấy đơn'],
    ['fleet-orders-offline', 'Đang ngoại tuyến'],
    ['fleet-orders-conflict', 'Danh sách đã có phiên bản mới'],
  ])('renders recoverable Order list scenario %s', (scenarioId, expectedCopy) => {
    render(<FleetOrdersScreen view={createFleetPreviewView('orders', scenarioId)} />);
    expectReadOnlySurface();
    expect(screen.getByText(expectedCopy)).toBeTruthy();
  });

  it.each([
    ['fleet-order-detail-stale-tracking', 'Dữ liệu bản đồ có thể đã cũ'],
    ['fleet-order-detail-no-location', 'Chưa có vị trí hợp lệ.'],
    ['fleet-order-detail-media-error', 'Không thể tải media'],
  ])('keeps authorized detail context for region scenario %s', (scenarioId, expectedCopy) => {
    render(<FleetOrderDetailScreen view={createFleetPreviewView('order-detail', scenarioId)} />);
    expectReadOnlySurface();
    expect(screen.getByText(expectedCopy)).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Lộ trình' })).toBeTruthy();
  });

  it('renders accessible previous and next pagination links', () => {
    render(
      <FleetPaginationLinks
        hrefForPage={(page) => `/fleet/orders?page=${page}`}
        page={2}
        totalPages={3}
      />,
    );
    expect(screen.getByRole('link', { name: 'Trang trước' }).getAttribute('href')).toBe(
      '/fleet/orders?page=1',
    );
    expect(screen.getByRole('link', { name: 'Trang sau' }).getAttribute('href')).toBe(
      '/fleet/orders?page=3',
    );
  });

  it.each(['drivers', 'orders', 'order-detail'] as const)(
    'reuses the private-safe scope denial on the %s route',
    (route) => {
      if (route === 'drivers') {
        render(
          <FleetDriversScreen view={createFleetPreviewView('drivers', 'fleet-scope-denied')} />,
        );
      } else if (route === 'orders') {
        render(<FleetOrdersScreen view={createFleetPreviewView('orders', 'fleet-scope-denied')} />);
      } else {
        render(
          <FleetOrderDetailScreen
            view={createFleetPreviewView('order-detail', 'fleet-scope-denied')}
          />,
        );
      }

      expect(screen.getByText('Bạn không có quyền xem đội xe này')).toBeTruthy();
      expect(screen.queryByText(/Sao Mai/)).toBeNull();
      expect(screen.queryByText(/LP-F-/)).toBeNull();
    },
  );
});
