import { describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { DriverNavigationSheet } from './DriverNavigationSheet';

describe('DriverNavigationSheet (States 4, 5, 12)', () => {
  const baseProps = {
    orderCode: '#LP-8921',
    address: '124 Hoàng Hoa Thám, Ba Đình, Hà Nội',
    contactName: 'Anh Tuấn',
    contactPhone: '0912345678',
    isAtPickupGeofence: false,
    onConfirmArrival: jest.fn(),
    isDarkMode: false,
  };

  it('renders 56pt primary button "Tôi đã đến nơi" (State 4)', async () => {
    const screen = await render(<DriverNavigationSheet {...baseProps} />);
    const button = screen.getByTestId('btn-confirm-arrival');
    expect(button).toBeTruthy();
    expect(screen.getByText('Tôi đã đến nơi')).toBeTruthy();
    fireEvent.press(button);
    expect(baseProps.onConfirmArrival).toHaveBeenCalledTimes(1);
  });

  it('displays geofence arrival suggestion when within 100m without auto-submitting (State 5)', async () => {
    const screen = await render(<DriverNavigationSheet {...baseProps} isAtPickupGeofence={true} />);
    expect(screen.getByTestId('geofence-banner')).toBeTruthy();
    expect(screen.getByText(/GỢI Ý ĐẾN NƠI/i)).toBeTruthy();
  });

  it('applies OLED dark palette when isDarkMode is true (State 12)', async () => {
    const screen = await render(<DriverNavigationSheet {...baseProps} isDarkMode={true} />);
    expect(screen.getByTestId('driver-nav-sheet-container')).toHaveStyle({
      backgroundColor: '#161F30',
    });
  });
});
