import { describe, expect, it } from '@jest/globals';
import { render } from '@testing-library/react-native';

import {
  RealInteractiveMap,
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

  it('anchors destination coordinates around origin when destination is not in dictionary', () => {
    const daNangOriginCoords = { lat: 16.035, lng: 108.243 };
    const resolved = resolveLocationCoords('400 Đường Chưa Biết Tên ABC', daNangOriginCoords);
    expect(Math.abs(resolved.lat - daNangOriginCoords.lat)).toBeLessThan(0.05);
    expect(Math.abs(resolved.lng - daNangOriginCoords.lng)).toBeLessThan(0.05);
  });
});
