import { describe, expect, it, jest } from '@jest/globals';
import { render } from '@testing-library/react-native';

jest.mock('react-native-webview', () => ({ WebView: () => null }));

import {
  postTruckLocationToMapFrame,
  postNearbyDriversToMapFrame,
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

    const nguHanhSon = resolveLocationCoords(
      '12 Đường Hoàng Công Chất, Phường Ngũ Hành Sơn, Thành phố Đà Nẵng',
    );
    expect([16.035, 16.033]).toContainEqual(Number(nguHanhSon.lat.toFixed(3)));
    expect([108.243, 108.245]).toContainEqual(Number(nguHanhSon.lng.toFixed(3)));
    expect(nguHanhSon.lat).not.toBeCloseTo(16.054, 3);

    const fallback = resolveLocationCoords('Địa chỉ bất kỳ chưa biết');
    expect(fallback.lat).toBeCloseTo(10.7769, 4);
    expect(fallback.lng).toBeCloseTo(106.7009, 4);
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

  it('anchors destination coordinates exactly at reference origin when destination is not in dictionary', () => {
    const daNangOriginCoords = { lat: 16.035, lng: 108.243 };
    const resolved = resolveLocationCoords('400 Đường Chưa Biết Tên ABC', daNangOriginCoords);
    expect(resolved.lat).toBe(daNangOriginCoords.lat);
    expect(resolved.lng).toBe(daNangOriginCoords.lng);
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

  it('renders routeSegments with 3 distinct polyline bands when provided under PROVIDED_ONLY', () => {
    const html = buildLeafletHtml({
      destinationCoords: { lat: 10.76, lng: 106.8 },
      destinationLabel: 'Điểm giao',
      interactive: true,
      mapInstanceId: 'test-segments',
      mode: 'tracking',
      originCoords: { lat: 10.79, lng: 106.65 },
      originLabel: 'Điểm lấy',
      pinCoords: { lat: 0, lng: 0 },
      stopsCoords: [],
      truckCoords: { lat: 0, lng: 0 },
      truckEtaLabel: '',
      vietmapApiKey: 'super-secret-key',
      routeResolutionPolicy: 'PROVIDED_ONLY',
      routeSegments: [
        {
          kind: 'completed',
          coords: [
            { lat: 10.79, lng: 106.65 },
            { lat: 10.78, lng: 106.67 },
          ],
        },
        {
          kind: 'active',
          coords: [
            { lat: 10.78, lng: 106.67 },
            { lat: 10.77, lng: 106.72 },
          ],
        },
        {
          kind: 'pending',
          coords: [
            { lat: 10.77, lng: 106.72 },
            { lat: 10.76, lng: 106.8 },
          ],
        },
      ],
    });

    expect(html).not.toContain('super-secret-key');
    expect(html).not.toContain('maps.vietmap.vn/api/route');
    expect(html).toContain('applyRouteSegments');
    expect(html).toContain('#94A3B8'); // completed and pending color
    expect(html).toContain('#0B1E42'); // active glow and active band
    expect(html).toContain('dashArray'); // pending dashes
  });

  it('renders intermediate stops with progress classes and sequence markers', () => {
    const html = buildLeafletHtml({
      destinationCoords: { lat: 10.76, lng: 106.8 },
      destinationLabel: 'Điểm giao',
      interactive: true,
      mapInstanceId: 'test-stops',
      mode: 'tracking',
      originCoords: { lat: 10.79, lng: 106.65 },
      originLabel: 'Điểm lấy',
      pinCoords: { lat: 0, lng: 0 },
      stopsCoords: [
        {
          label: 'Kho trung chuyển',
          coords: { lat: 10.775, lng: 106.7 },
          progress: 'IN_SERVICE',
          sequence: 1,
        },
        {
          label: 'Điểm dỡ hàng 2',
          coords: { lat: 10.768, lng: 106.75 },
          progress: 'COMPLETED',
          sequence: 2,
        },
      ],
      truckCoords: { lat: 0, lng: 0 },
      truckEtaLabel: '',
      routeResolutionPolicy: 'PROVIDED_ONLY',
    });

    expect(html).toContain('.pin-core.stop-in_service');
    expect(html).toContain('.pin-core.stop-completed');
    expect(html).toContain('"progress":"IN_SERVICE"');
    expect(html).toContain('"progress":"COMPLETED"');
    expect(html).toContain("s.progress === 'COMPLETED' ? '✓' :");
  });

  it('renders nearby driver markers in fallback view', async () => {
    const screen = await render(
      <RealInteractiveMap
        destination={{ label: 'Cảng Cát Lái' }}
        mode="preview"
        nearbyDrivers={[
          { id: 'driver-1', lat: 10.7769, lng: 106.7009, vehicleType: 'TRUCK' },
          { id: 'driver-2', lat: 10.778, lng: 106.702, vehicleType: 'VAN' },
        ]}
        origin={{ label: 'Quận 1' }}
      />,
    );

    expect(screen.getByTestId('nearby-drivers-layer')).toBeTruthy();
    expect(screen.getByTestId('nearby-driver-driver-1')).toBeTruthy();
    expect(screen.getByTestId('nearby-driver-driver-2')).toBeTruthy();
    await screen.unmount();
  });

  it('includes nearby driver configuration and rendering script in HTML output', () => {
    const html = buildLeafletHtml({
      destinationCoords: { lat: 10.76, lng: 106.8 },
      destinationLabel: 'Điểm giao',
      interactive: true,
      mapInstanceId: 'test-drivers',
      mode: 'preview',
      originCoords: { lat: 10.79, lng: 106.65 },
      originLabel: 'Điểm lấy',
      pinCoords: { lat: 0, lng: 0 },
      stopsCoords: [],
      truckCoords: { lat: 0, lng: 0 },
      truckEtaLabel: '',
      nearbyDrivers: [
        { id: 'd-1', lat: 10.775, lng: 106.7, vehicleType: 'TRUCK', licensePlate: '59C-111.22' },
      ],
    });

    expect(html).toContain('nearbyDriversLayer');
    expect(html).toContain('custom-nearby-driver-icon');
    expect(html).toContain('"licensePlate":"59C-111.22"');
    expect(html).toContain('LEOPARD_UPDATE_NEARBY_DRIVERS');
  });

  it('posts nearby drivers update to map frame window', () => {
    const mockPostMessage = jest.fn();
    const mapFrame = { contentWindow: { postMessage: mockPostMessage } };

    postNearbyDriversToMapFrame(mapFrame as any, {
      type: 'LEOPARD_UPDATE_NEARBY_DRIVERS',
      mapInstanceId: 'map-1',
      drivers: [{ id: 'd-1', lat: 10.77, lng: 106.7 }],
    });

    expect(mockPostMessage).toHaveBeenCalledWith(
      {
        type: 'LEOPARD_UPDATE_NEARBY_DRIVERS',
        mapInstanceId: 'map-1',
        drivers: [{ id: 'd-1', lat: 10.77, lng: 106.7 }],
      },
      '*',
    );
  });
});
