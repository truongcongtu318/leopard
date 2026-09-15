import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render } from '@testing-library/react-native';
import React from 'react';
import { Alert, Linking } from 'react-native';

import {
  MissionMapCanvas,
  openExternalNavigation,
} from './MissionMapCanvas';
import type { DriverRouteEtaView, DriverTrackingView } from '../../model';

const defaultTracking: DriverTrackingView = {
  kind: 'healthy',
  label: 'Đang gửi vị trí',
  lastUpdatedLabel: 'Vừa xong',
  queuedPointCount: null,
};

describe('MissionMapCanvas (Task 18)', () => {
  it('renders normal computed ETA with "ETA dự kiến"', async () => {
    const eta: DriverRouteEtaView = {
      distanceMeters: 12500,
      durationSeconds: 900, // 15 mins
      etaTargetTime: '10:30',
      estimateAgeLabel: 'Vừa xong',
      recomputeStatus: 'READY',
      outcome: 'COMPUTED',
      source: 'VIETMAP',
      activeLegIndex: 0,
      activeStopId: null,
      polylineCoords: [{ lat: 10.79, lng: 106.65 }, { lat: 10.76, lng: 106.8 }],
    };

    const screen = await render(
      <MissionMapCanvas
        destination={{ label: 'Điểm giao' }}
        eta={eta}
        origin={{ label: 'Điểm lấy' }}
        tracking={defaultTracking}
      />,
    );

    expect(screen.getByTestId('pill-eta-estimate')).toBeTruthy();
    expect(screen.getByText(/ETA dự kiến · 15 phút/)).toBeTruthy();
    expect(screen.queryByTestId('badge-demo-data')).toBeNull();
    await screen.unmount();
  });

  it('renders unavailable label when ETA outcome is NOT_COMPUTABLE', async () => {
    const eta: DriverRouteEtaView = {
      distanceMeters: 0,
      durationSeconds: 0,
      etaTargetTime: null,
      estimateAgeLabel: null,
      recomputeStatus: 'READY',
      outcome: 'NOT_COMPUTABLE',
      source: 'VIETMAP',
      activeLegIndex: 0,
      activeStopId: null,
      polylineCoords: [],
    };

    const screen = await render(
      <MissionMapCanvas
        destination={{ label: 'Điểm giao' }}
        eta={eta}
        origin={{ label: 'Điểm lấy' }}
        tracking={defaultTracking}
      />,
    );

    expect(screen.getByText('Lộ trình không khả dụng')).toBeTruthy();
    await screen.unmount();
  });

  it('renders recompute status PENDING message', async () => {
    const eta: DriverRouteEtaView = {
      distanceMeters: 10000,
      durationSeconds: 600,
      etaTargetTime: null,
      estimateAgeLabel: null,
      recomputeStatus: 'PENDING',
      outcome: 'COMPUTED',
      source: 'VIETMAP',
      activeLegIndex: 0,
      activeStopId: null,
      polylineCoords: [],
    };

    const screen = await render(
      <MissionMapCanvas
        destination={{ label: 'Điểm giao' }}
        eta={eta}
        origin={{ label: 'Điểm lấy' }}
        tracking={defaultTracking}
      />,
    );

    expect(screen.getByText('Đang cập nhật ETA…')).toBeTruthy();
    await screen.unmount();
  });

  it('renders recompute FAILED with estimateAgeLabel without extra spaces', async () => {
    const etaWithAge: DriverRouteEtaView = {
      distanceMeters: 10000,
      durationSeconds: 600,
      etaTargetTime: null,
      estimateAgeLabel: '3 phút trước',
      recomputeStatus: 'FAILED',
      outcome: 'COMPUTED',
      source: 'VIETMAP',
      activeLegIndex: 0,
      activeStopId: null,
      polylineCoords: [],
    };

    const screen1 = await render(
      <MissionMapCanvas
        destination={{ label: 'Điểm giao' }}
        eta={etaWithAge}
        origin={{ label: 'Điểm lấy' }}
        tracking={defaultTracking}
      />,
    );

    expect(
      screen1.getByText('Không thể tính lại lộ trình · Dự kiến cũ (3 phút trước)'),
    ).toBeTruthy();
    await screen1.unmount();

    const etaWithoutAge: DriverRouteEtaView = {
      ...etaWithAge,
      estimateAgeLabel: null,
    };

    const screen2 = await render(
      <MissionMapCanvas
        destination={{ label: 'Điểm giao' }}
        eta={etaWithoutAge}
        origin={{ label: 'Điểm lấy' }}
        tracking={defaultTracking}
      />,
    );

    expect(screen2.getByText('Không thể tính lại lộ trình')).toBeTruthy();
    await screen2.unmount();
  });

  it('renders "Dữ liệu mô phỏng" badge only when source is DEMO', async () => {
    const demoEta: DriverRouteEtaView = {
      distanceMeters: 10000,
      durationSeconds: 600,
      etaTargetTime: null,
      estimateAgeLabel: null,
      recomputeStatus: 'READY',
      outcome: 'COMPUTED',
      source: 'DEMO',
      activeLegIndex: 0,
      activeStopId: null,
      polylineCoords: [],
    };

    const screen = await render(
      <MissionMapCanvas
        destination={{ label: 'Điểm giao' }}
        eta={demoEta}
        origin={{ label: 'Điểm lấy' }}
        tracking={defaultTracking}
      />,
    );

    expect(screen.getByTestId('badge-demo-data')).toBeTruthy();
    expect(screen.getByText('Dữ liệu mô phỏng')).toBeTruthy();
    await screen.unmount();
  });

  it('renders stale badge when ETA outcome is STALE', async () => {
    const staleEta: DriverRouteEtaView = {
      distanceMeters: 10000,
      durationSeconds: 600,
      etaTargetTime: null,
      estimateAgeLabel: '5 phút trước',
      recomputeStatus: 'READY',
      outcome: 'STALE',
      source: 'VIETMAP',
      activeLegIndex: 0,
      activeStopId: null,
      polylineCoords: [],
    };

    const screen = await render(
      <MissionMapCanvas
        destination={{ label: 'Điểm giao' }}
        eta={staleEta}
        origin={{ label: 'Điểm lấy' }}
        tracking={defaultTracking}
      />,
    );

    expect(screen.getByTestId('badge-stale-eta')).toBeTruthy();
    expect(screen.getByText('ETA cũ')).toBeTruthy();
    await screen.unmount();
  });

  it('disables external navigation button when next stop has no coordinates', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});

    const screen = await render(
      <MissionMapCanvas
        destination={{ label: 'Điểm giao' }} // no coords
        origin={{ label: 'Điểm lấy' }}
        stops={[
          {
            id: 's-1',
            stopId: 's-1',
            sequence: 1,
            label: 'Kho trung chuyển',
            address: 'Kho trung chuyển',
            progress: 'PENDING',
            // lat & lng missing!
          },
        ]}
        tracking={defaultTracking}
      />,
    );

    const navBtn = screen.getByTestId('btn-navigate-next-stop');
    expect(navBtn.props.accessibilityState?.disabled).toBe(true);

    alertSpy.mockRestore();
    await screen.unmount();
  });

  it('navigates to next actionable stop when coordinates are present', async () => {
    const openURLSpy = jest.spyOn(Linking, 'openURL').mockResolvedValue(true as any);

    const screen = await render(
      <MissionMapCanvas
        destination={{ label: 'Điểm giao', coords: { lat: 10.76, lng: 106.8 } }}
        origin={{ label: 'Điểm lấy', coords: { lat: 10.79, lng: 106.65 } }}
        stops={[
          {
            id: 's-1',
            stopId: 's-1',
            sequence: 1,
            label: 'Kho trung chuyển 1',
            address: 'Kho trung chuyển 1',
            progress: 'COMPLETED',
            lat: 10.78,
            lng: 106.67,
          },
          {
            id: 's-2',
            stopId: 's-2',
            sequence: 2,
            label: 'Kho trung chuyển 2',
            address: 'Kho trung chuyển 2',
            progress: 'PENDING',
            lat: 10.77,
            lng: 106.72,
          },
        ]}
        tracking={defaultTracking}
      />,
    );

    const navBtn = screen.getByTestId('btn-navigate-next-stop');
    expect(navBtn.props.accessibilityState?.disabled).toBe(false);
    await fireEvent.press(navBtn);

    expect(openURLSpy).toHaveBeenCalledWith(
      expect.stringContaining('10.77%2C106.72'),
    );

    openURLSpy.mockRestore();
    await screen.unmount();
  });

  it('displays truck warning alert before navigating when vehicleType is TRUCK', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    const openURLSpy = jest.spyOn(Linking, 'openURL').mockResolvedValue(true as any);

    const screen = await render(
      <MissionMapCanvas
        destination={{ label: 'Điểm giao', coords: { lat: 10.76, lng: 106.8 } }}
        origin={{ label: 'Điểm lấy', coords: { lat: 10.79, lng: 106.65 } }}
        tracking={defaultTracking}
        vehicleType="TRUCK_5T"
      />,
    );

    const navBtn = screen.getByTestId('btn-navigate-next-stop');
    await fireEvent.press(navBtn);

    expect(alertSpy).toHaveBeenCalledWith(
      'Lưu ý điều hướng xe tải',
      expect.stringContaining('Google Maps có thể không bảo đảm'),
      expect.any(Array),
    );

    alertSpy.mockRestore();
    openURLSpy.mockRestore();
    await screen.unmount();
  });
});
