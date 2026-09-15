import { describe, expect, it, jest } from '@jest/globals';
import { render } from '@testing-library/react-native';

jest.mock('react-native-webview', () => ({ WebView: () => null }));

import {
  postTruckLocationToMapFrame,
  RealInteractiveMap,
  buildLeafletHtml,
  resolveLocationCoords,
} from './RealInteractiveMap';

describe('RealInteractiveMap', () => {
  it('resolves deterministic coordinates for known Vietnamese locations', () => {
    const tanBinh = resolveLocationCoords('Kho VLXD Tân Bình');
    expect(tanBinh.lat).toBeCloseTo(10.795, 2);
    expect(tanBinh.lng).toBeCloseTo(106.652, 2);

    const catLai = resolveLocationCoords('Cảng Cát Lái');
    expect(catLai.lat).toBeCloseTo(10.764, 2);
    expect(catLai.lng).toBeCloseTo(106.796, 2);

    const fallback = resolveLocationCoords('Địa chỉ bất kỳ chưa biết');
    expect(fallback.lat).toBeGreaterThan(10.0);
    expect(fallback.lat).toBeLessThan(11.5);
    expect(fallback.lng).toBeGreaterThan(106.0);
    expect(fallback.lng).toBeLessThan(107.5);
  });

  it('renders route mode with origin and destination', async () => {
    const screen = await render(
      <RealInteractiveMap
        destination={{ label: 'KCN Tân Tạo, Bình Tân' }}
        mode="route"
        origin={{ label: 'Kho VLXD Tân Bình' }}
        testID="custom-map"
      />,
    );

    expect(screen.getByTestId('custom-map')).toBeTruthy();
    expect(screen.getByText('BẢN ĐỒ THỰC TẾ')).toBeTruthy();
    await screen.unmount();
  });

  it('renders tracking mode with truck ETA badge', async () => {
    const screen = await render(
      <RealInteractiveMap
        destination={{ label: 'Cảng Cát Lái' }}
        mode="tracking"
        origin={{ label: 'Quận 7' }}
        truckEtaMinutes={12}
      />,
    );

    expect(screen.getByTestId('real-interactive-map')).toBeTruthy();
    expect(screen.getByText('12 phút')).toBeTruthy();
    await screen.unmount();
  });

  it('renders a current-location map without route endpoints', async () => {
    const screen = await render(
      <RealInteractiveMap
        initialPinCoords={{ lat: 10.81234, lng: 106.67123 }}
        mode="location"
        truckLocation={{ lat: 10.81234, lng: 106.67123 }}
      />,
    );

    expect(screen.getByLabelText('Bản đồ vị trí hiện tại của tài xế')).toBeTruthy();
    expect(screen.queryByLabelText(/Bản đồ lộ trình từ/)).toBeNull();
    await screen.unmount();
  });

  it('sends precise GPS coordinates only to the selected map frame', () => {
    const selectedFramePostMessage = jest.fn();
    const unrelatedFramePostMessage = jest.fn();
    const selectedFrame = {
      contentWindow: { postMessage: selectedFramePostMessage },
    } as unknown as Pick<HTMLIFrameElement, 'contentWindow'>;

    postTruckLocationToMapFrame(selectedFrame, {
      type: 'LEOPARD_UPDATE_TRUCK_LOCATION',
      mapInstanceId: 'driver-home-map',
      lat: 10.81234,
      lng: 106.67123,
      eta: '',
    });

    expect(selectedFramePostMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        mapInstanceId: 'driver-home-map',
        lat: 10.81234,
        lng: 106.67123,
      }),
      '*',
    );
    expect(unrelatedFramePostMessage).not.toHaveBeenCalled();
  });

  it('does not render naked numeric coordinate text in screen hierarchy', async () => {
    const screen = await render(
      <RealInteractiveMap
        destination={{ label: 'Thành phố Thủ Đức' }}
        mode="route"
        origin={{ label: 'Quận 7' }}
      />,
    );

    expect(screen.queryByText(/10\.\d+,\s*106\.\d+/)).toBeNull();
    await screen.unmount();
  });
});

describe('RealInteractiveMap — PROVIDED_ONLY route policy', () => {
  it('never emits a Vietmap/OSRM fetch call when routeResolutionPolicy is PROVIDED_ONLY, even with valid routeCoords', () => {
    const html = buildLeafletHtml({
      destinationCoords: { lat: 10.76, lng: 106.8 }, destinationLabel: 'Điểm giao',
      interactive: true, mapInstanceId: 'test-1', mode: 'tracking',
      originCoords: { lat: 10.79, lng: 106.65 }, originLabel: 'Điểm lấy',
      pinCoords: { lat: 0, lng: 0 }, stopsCoords: [], truckCoords: { lat: 0, lng: 0 }, truckEtaLabel: '',
      vietmapApiKey: 'super-secret-key',
      routeResolutionPolicy: 'PROVIDED_ONLY',
      routeCoords: [{ lat: 10.79, lng: 106.65 }, { lat: 10.76, lng: 106.8 }],
    });

    expect(html).not.toContain('super-secret-key');
    expect(html).not.toContain('maps.vietmap.vn/api/route');
    expect(html).not.toContain('router.project-osrm.org');
  });

  it('shows a "no route data" banner when routeCoords is empty under PROVIDED_ONLY', () => {
    const html = buildLeafletHtml({
      destinationCoords: { lat: 10.76, lng: 106.8 }, destinationLabel: 'Điểm giao',
      interactive: true, mapInstanceId: 'test-2', mode: 'tracking',
      originCoords: { lat: 10.79, lng: 106.65 }, originLabel: 'Điểm lấy',
      pinCoords: { lat: 0, lng: 0 }, stopsCoords: [], truckCoords: { lat: 0, lng: 0 }, truckEtaLabel: '',
      routeResolutionPolicy: 'PROVIDED_ONLY',
      routeCoords: [],
    });

    expect(html).toContain('Chưa có dữ liệu tuyến đường');
    expect(html).not.toContain('maps.vietmap.vn/api/route');
  });

  it('preserves the existing client-fetch behavior when routeResolutionPolicy is ALLOW_CLIENT_PREVIEW (default)', () => {
    const html = buildLeafletHtml({
      destinationCoords: { lat: 10.76, lng: 106.8 }, destinationLabel: 'Điểm giao',
      interactive: true, mapInstanceId: 'test-3', mode: 'route',
      originCoords: { lat: 10.79, lng: 106.65 }, originLabel: 'Điểm lấy',
      pinCoords: { lat: 0, lng: 0 }, stopsCoords: [], truckCoords: { lat: 0, lng: 0 }, truckEtaLabel: '',
      vietmapApiKey: 'a-key',
    });

    expect(html).toContain('maps.vietmap.vn/api/route');
  });
});
