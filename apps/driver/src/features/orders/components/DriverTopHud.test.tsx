import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, within } from '@testing-library/react-native';
import React from 'react';

import { DriverTopHud } from './DriverTopHud';

describe('DriverTopHud', () => {
  it('renders all three cockpit HUD pills', async () => {
    const screen = await render(
      <DriverTopHud
        isOnline={true}
        onToggleAvailability={jest.fn()}
      />,
    );

    expect(screen.getByTestId('driver-profile-pill')).toBeTruthy();
    expect(screen.getByTestId('driver-duty-toggle')).toBeTruthy();
    expect(screen.getByTestId('driver-earnings-pill')).toBeTruthy();

    await screen.unmount();
  });

  describe('Left pill (profile)', () => {
    it('displays vehicle plate when vehiclePlate is provided', async () => {
      const screen = await render(
        <DriverTopHud
          driverName="Nguyễn Văn A"
          isOnline={true}
          onToggleAvailability={jest.fn()}
          vehiclePlate="29A-123.45"
        />,
      );

      expect(screen.getByText('29A-123.45')).toBeTruthy();

      await screen.unmount();
    });

    it('displays driver name when vehiclePlate is absent', async () => {
      const screen = await render(
        <DriverTopHud
          driverName="Nguyễn Văn A"
          isOnline={true}
          onToggleAvailability={jest.fn()}
        />,
      );

      expect(screen.getByText('Nguyễn Văn A')).toBeTruthy();

      await screen.unmount();
    });

    it('falls back to default label when neither plate nor name is provided', async () => {
      const screen = await render(
        <DriverTopHud
          isOnline={true}
          onToggleAvailability={jest.fn()}
        />,
      );

      expect(screen.getByText('Tài xế')).toBeTruthy();

      await screen.unmount();
    });

    it('calls onOpenProfile when pressed', async () => {
      const onOpenProfile = jest.fn();
      const screen = await render(
        <DriverTopHud
          isOnline={true}
          onOpenProfile={onOpenProfile}
          onToggleAvailability={jest.fn()}
        />,
      );

      await fireEvent.press(screen.getByTestId('driver-profile-pill'));
      expect(onOpenProfile).toHaveBeenCalledTimes(1);

      await screen.unmount();
    });
  });

  describe('Center pill (duty toggle)', () => {
    it('displays TRỰC TUYẾN and green dot when isOnline is true', async () => {
      const screen = await render(
        <DriverTopHud
          isOnline={true}
          onToggleAvailability={jest.fn()}
        />,
      );

      expect(screen.getByText('TRỰC TUYẾN')).toBeTruthy();
      const dot = screen.getByTestId('driver-duty-dot');
      const dotStyle = Array.isArray(dot.props.style)
        ? Object.assign({}, ...dot.props.style)
        : dot.props.style;
      expect(dotStyle.backgroundColor).toBe('#16A34A');

      await screen.unmount();
    });

    it('displays NGHỈ and gray dot when isOnline is false', async () => {
      const screen = await render(
        <DriverTopHud
          isOnline={false}
          onToggleAvailability={jest.fn()}
        />,
      );

      expect(screen.getByText('NGHỈ')).toBeTruthy();
      const dot = screen.getByTestId('driver-duty-dot');
      const dotStyle = Array.isArray(dot.props.style)
        ? Object.assign({}, ...dot.props.style)
        : dot.props.style;
      expect(dotStyle.backgroundColor).toBe('#64748B');

      await screen.unmount();
    });

    it('calls onToggleAvailability when pressed', async () => {
      const onToggleAvailability = jest.fn();
      const screen = await render(
        <DriverTopHud
          isOnline={true}
          onToggleAvailability={onToggleAvailability}
        />,
      );

      await fireEvent.press(screen.getByTestId('driver-duty-toggle'));
      expect(onToggleAvailability).toHaveBeenCalledTimes(1);

      await screen.unmount();
    });
  });

  describe('Right pill (earnings)', () => {
    it('displays todayEarningsLabel when provided', async () => {
      const screen = await render(
        <DriverTopHud
          isOnline={true}
          onToggleAvailability={jest.fn()}
          todayEarningsLabel="450.000 ₫"
        />,
      );

      expect(screen.getByText('450.000 ₫')).toBeTruthy();

      await screen.unmount();
    });

    it('displays fallback earnings label when todayEarningsLabel is not provided', async () => {
      const screen = await render(
        <DriverTopHud
          isOnline={true}
          onToggleAvailability={jest.fn()}
        />,
      );

      expect(screen.getByText('0 ₫')).toBeTruthy();

      await screen.unmount();
    });

    it('renders trip count badge with tabular-nums font variant when todayTripsCount is provided', async () => {
      const screen = await render(
        <DriverTopHud
          isOnline={true}
          onToggleAvailability={jest.fn()}
          todayEarningsLabel="450.000 ₫"
          todayTripsCount={5}
        />,
      );

      const tripBadge = screen.getByTestId('driver-trip-count-badge');
      expect(tripBadge).toBeTruthy();
      expect(within(tripBadge).getByText('5')).toBeTruthy();

      await screen.unmount();
    });

    it('does not render trip count badge when todayTripsCount is undefined', async () => {
      const screen = await render(
        <DriverTopHud
          isOnline={true}
          onToggleAvailability={jest.fn()}
          todayEarningsLabel="450.000 ₫"
        />,
      );

      expect(screen.queryByTestId('driver-trip-count-badge')).toBeNull();

      await screen.unmount();
    });

    it('calls onOpenEarnings when pressed', async () => {
      const onOpenEarnings = jest.fn();
      const screen = await render(
        <DriverTopHud
          isOnline={true}
          onOpenEarnings={onOpenEarnings}
          onToggleAvailability={jest.fn()}
        />,
      );

      await fireEvent.press(screen.getByTestId('driver-earnings-pill'));
      expect(onOpenEarnings).toHaveBeenCalledTimes(1);

      await screen.unmount();
    });
  });
});
