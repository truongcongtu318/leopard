import { describe, it, expect } from '@jest/globals';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

import {
  BentoMapCard,
  BentoOrdersCard,
  StatusOverviewCard,
  FulfillmentPerformanceCard,
  RevenueOverTimeCard,
} from './index';

describe('NexaFleet Bento Widgets', () => {
  it('renders BentoMapCard with title, active order code, and zoom controls', () => {
    render(
      <BentoMapCard
        title="Bản đồ thời gian thực"
        activeOrderCode="OR-1000 GreenMart"
        searchPlaceholder="Tìm kiếm đơn hàng..."
      />,
    );

    expect(screen.getByLabelText('Bản đồ thời gian thực')).toBeTruthy();
    expect(screen.getByText('OR-1000 GreenMart')).toBeTruthy();
    expect(screen.getByPlaceholderText('Tìm kiếm đơn hàng...')).toBeTruthy();
    expect(screen.getByLabelText('Phóng to bản đồ')).toBeTruthy();
    expect(screen.getByLabelText('Thu nhỏ bản đồ')).toBeTruthy();
  });

  it('renders BentoOrdersCard with explicit BE orders and handles filter clicks', () => {
    const onFilterChange = jest.fn();
    render(
      <BentoOrdersCard
        title="Sổ điều phối đơn hàng"
        totalCount={1}
        orders={[
          {
            id: 'LP-BE-001',
            customer: 'Khách BE',
            route: { from: 'Kho A', to: 'Kho B' },
            weight: '100.000 ₫',
            eta: '14:30',
            status: 'IN_TRANSIT',
            statusLabel: 'Đang vận chuyển',
          },
        ]}
        onFilterChange={onFilterChange}
      />,
    );

    expect(screen.getByText('Sổ điều phối đơn hàng')).toBeTruthy();
    expect(screen.getByText('(1)')).toBeTruthy();
    expect(screen.getByText('LP-BE-001')).toBeTruthy();
    expect(screen.getByText('Khách BE')).toBeTruthy();
    expect(screen.getByText('Kho A')).toBeTruthy();
    expect(screen.getByText('Kho B')).toBeTruthy();

    const pendingBtn = screen.getByRole('button', { name: 'Chờ tiếp nhận' });
    fireEvent.click(pendingBtn);
    expect(onFilterChange).toHaveBeenCalledWith('pending');
  });

  it('renders empty state when BE returns no orders', () => {
    render(<BentoOrdersCard title="Sổ điều phối đơn hàng" totalCount={0} orders={[]} />);
    expect(screen.getByText('Không có đơn hàng nào trong trạng thái này.')).toBeTruthy();
  });

  it('renders StatusOverviewCard with all 4 status categories and metrics', () => {
    render(
      <StatusOverviewCard
        title="Cơ cấu trạng thái đơn"
        loadingPercent={17}
        inTransitPercent={32}
        unloadingPercent={13}
        deliveredPercent={38}
      />,
    );

    expect(screen.getByText('Cơ cấu trạng thái đơn')).toBeTruthy();
    expect(screen.getByText('17%')).toBeTruthy();
    expect(screen.getByText('32%')).toBeTruthy();
    expect(screen.getByText('13%')).toBeTruthy();
    expect(screen.getByText('38%')).toBeTruthy();
    expect(screen.getByText('Đang lấy hàng')).toBeTruthy();
    expect(screen.getByText('Đang vận chuyển')).toBeTruthy();
    expect(screen.getByText('Đang dỡ hàng')).toBeTruthy();
    expect(screen.getByText('Đã giao hàng')).toBeTruthy();
  });

  it('renders FulfillmentPerformanceCard with KPI rate and subtitle', () => {
    render(
      <FulfillmentPerformanceCard
        title="Hiệu suất giao đúng hạn (OTD)"
        rate={89}
        subtitle="trung bình ca trực"
      />,
    );

    expect(screen.getByText('Hiệu suất giao đúng hạn (OTD)')).toBeTruthy();
    expect(screen.getByText('89%')).toBeTruthy();
    expect(screen.getByText('trung bình ca trực')).toBeTruthy();
  });

  it('renders RevenueOverTimeCard with BE amount only', () => {
    const onPeriodChange = jest.fn();
    render(
      <RevenueOverTimeCard
        title="Doanh thu cước vận chuyển"
        amount="184.000 ₫"
        growthLabel="Tổng giá trị đơn DELIVERED"
        onPeriodChange={onPeriodChange}
      />,
    );

    expect(screen.getByText('Doanh thu cước vận chuyển')).toBeTruthy();
    expect(screen.getByText('184.000 ₫')).toBeTruthy();
    expect(screen.getByText('Tổng giá trị đơn DELIVERED')).toBeTruthy();

    const monthBtn = screen.getByRole('button', { name: 'Tháng' });
    fireEvent.click(monthBtn);
    expect(onPeriodChange).toHaveBeenCalledWith('month');
  });

  it('renders zero-revenue state from BE', () => {
    render(<RevenueOverTimeCard title="Doanh thu cước vận chuyển" amount="0 ₫" />);
    expect(screen.getByText('Chưa phát sinh doanh thu')).toBeTruthy();
  });
});
