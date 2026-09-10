import { describe, expect, it, jest } from '@jest/globals';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { TruckDrivebyScene } from './TruckDrivebyScene';
import { TruckTransitOverlay } from './TruckTransitOverlay';

describe('TruckDrivebyScene', () => {
  it('renders correctly with default props', () => {
    render(<TruckDrivebyScene />);
    expect(screen.getByTestId('truck-driveby-scene')).toBeTruthy();
    expect(screen.getByText(/LEOPARD/i)).toBeTruthy();
    expect(screen.getByText(/Kho Bình Dương/i)).toBeTruthy();
    expect(screen.getByText(/Cảng Cát Lái/i)).toBeTruthy();
  });

  it('updates vehicle type when selector chips are clicked', () => {
    const handleVehicleChange = jest.fn();
    render(<TruckDrivebyScene onVehicleChange={handleVehicleChange} />);

    const vanButton = screen.getByText(/Xe Van/i);
    fireEvent.click(vanButton);

    expect(handleVehicleChange).toHaveBeenCalledWith('VAN');
  });

  it('displays correct badge for different roles', () => {
    const { rerender } = render(<TruckDrivebyScene role="DRIVER" />);
    expect(screen.getByText(/TÀI XẾ ĐỐI TÁC/i)).toBeTruthy();

    rerender(<TruckDrivebyScene role="FLEET_OWNER" />);
    expect(screen.getByText(/CHỦ ĐỘI XE/i)).toBeTruthy();

    rerender(<TruckDrivebyScene role="ADMIN" />);
    expect(screen.getByText(/QUẢN TRỊ VIÊN/i)).toBeTruthy();
  });
});

describe('TruckTransitOverlay', () => {
  it('renders with inactive state', () => {
    render(<TruckTransitOverlay isActive={false} />);
    const overlay = screen.getByTestId('truck-transit-overlay');
    expect(overlay).toBeTruthy();
    expect(overlay.className).not.toContain('translate-x-[140vw]');
  });

  it('applies translation class when active', () => {
    render(<TruckTransitOverlay isActive={true} />);
    const overlay = screen.getByTestId('truck-transit-overlay');
    expect(overlay.className).toContain('translate-x-[140vw]');
  });
});
