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
        searchPlaceholder="Search order..."
      />,
    );

    expect(screen.getByLabelText('Bản đồ thời gian thực')).toBeTruthy();
    expect(screen.getByText('OR-1000 GreenMart')).toBeTruthy();
    expect(screen.getByPlaceholderText('Search order...')).toBeTruthy();
    expect(screen.getByLabelText('Phóng to bản đồ')).toBeTruthy();
    expect(screen.getByLabelText('Thu nhỏ bản đồ')).toBeTruthy();
  });

  it('renders BentoOrdersCard with order rows and handles filter clicks', () => {
    const onFilterChange = jest.fn();
    render(
      <BentoOrdersCard
        title="Orders"
        totalCount={301}
        onFilterChange={onFilterChange}
      />,
    );

    expect(screen.getByText('Orders')).toBeTruthy();
    expect(screen.getByText('(301)')).toBeTruthy();
    expect(screen.getByText('LP-A-260815-101')).toBeTruthy();
    expect(screen.getByText('Vinamilk Đà Nẵng')).toBeTruthy();
    expect(screen.getByText('KCN Hòa Khánh')).toBeTruthy();
    expect(screen.getByText('Cảng Tiên Sa')).toBeTruthy();

    const pendingBtn = screen.getByRole('button', { name: 'Pending' });
    fireEvent.click(pendingBtn);
    expect(onFilterChange).toHaveBeenCalledWith('pending');
  });

  it('renders StatusOverviewCard with all 4 status categories and metrics', () => {
    render(
      <StatusOverviewCard
        title="Status Overview"
        loadingPercent={17}
        inTransitPercent={32}
        unloadingPercent={13}
        deliveredPercent={38}
      />,
    );

    expect(screen.getByText('Status Overview')).toBeTruthy();
    expect(screen.getByText('17%')).toBeTruthy();
    expect(screen.getByText('32%')).toBeTruthy();
    expect(screen.getByText('13%')).toBeTruthy();
    expect(screen.getByText('38%')).toBeTruthy();
    expect(screen.getByText('Loading')).toBeTruthy();
    expect(screen.getByText('In Transit')).toBeTruthy();
    expect(screen.getByText('Unloading')).toBeTruthy();
    expect(screen.getByText('Delivered')).toBeTruthy();
  });

  it('renders FulfillmentPerformanceCard with KPI rate and subtitle', () => {
    render(
      <FulfillmentPerformanceCard
        rate={89}
        subtitle="on average"
      />,
    );

    expect(screen.getByText('Fulfillment Performance')).toBeTruthy();
    expect(screen.getByText('89%')).toBeTruthy();
    expect(screen.getByText('on average')).toBeTruthy();
  });

  it('renders RevenueOverTimeCard with amount and period options', () => {
    const onPeriodChange = jest.fn();
    render(
      <RevenueOverTimeCard
        amount="$239,187.00"
        growthLabel="+15% this month"
        onPeriodChange={onPeriodChange}
      />,
    );

    expect(screen.getByText('Revenue Over Time')).toBeTruthy();
    expect(screen.getByText('$239,187.00')).toBeTruthy();
    expect(screen.getByText('+15% this month')).toBeTruthy();

    const weekBtn = screen.getByRole('button', { name: 'Week' });
    fireEvent.click(weekBtn);
    expect(onPeriodChange).toHaveBeenCalledWith('week');
  });
});
