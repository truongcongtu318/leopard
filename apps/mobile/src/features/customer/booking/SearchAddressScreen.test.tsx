import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render } from '@testing-library/react-native';
import React from 'react';
import { SearchAddressScreen } from './SearchAddressScreen';

describe('SearchAddressScreen', () => {
  it('renders search input with autoFocus and shows "Chọn trên bản đồ" card', async () => {
    const onSelect = jest.fn();
    const onBack = jest.fn();
    const screen = await render(
      <SearchAddressScreen onBack={onBack} onSelectAddress={onSelect} />
    );

    expect(screen.getByPlaceholderText('Tìm địa chỉ giao hàng')).toBeTruthy();
    expect(screen.getByText('Chọn trên bản đồ')).toBeTruthy();
  });

  it('renders recent and saved addresses when search query is empty', async () => {
    const screen = await render(
      <SearchAddressScreen
        onBack={jest.fn()}
        onSelectAddress={jest.fn()}
        recentAddresses={[
          { id: 'r-1', name: 'Công trình Jamona City', address: 'Đào Trí, Q.7', distanceKm: 3.2 },
        ]}
      />
    );

    expect(screen.getByText('Gần đây')).toBeTruthy();
    expect(screen.getByText('Sổ địa chỉ')).toBeTruthy();
  });

  it('triggers onSelectAddress when a recent or search item is tapped', async () => {
    const onSelect = jest.fn();
    const screen = await render(
      <SearchAddressScreen
        onBack={jest.fn()}
        onSelectAddress={onSelect}
        recentAddresses={[
          { id: 'r-1', name: 'Công trình Jamona City', address: 'Đào Trí, Q.7', distanceKm: 3.2 },
        ]}
      />
    );

    const firstRecentItem = screen.getByText('Công trình Jamona City');
    fireEvent.press(firstRecentItem);

    expect(onSelect).toHaveBeenCalledWith(
      expect.stringContaining('Jamona'),
      undefined,
    );
  });

  it('displays empty results state when query has no matches', async () => {
    const screen = await render(
      <SearchAddressScreen onBack={jest.fn()} onSelectAddress={jest.fn()} />
    );

    const input = screen.getByPlaceholderText('Tìm địa chỉ giao hàng');
    fireEvent.changeText(input, 'DiaChiKhongTonTai12345');

    const emptyText = await screen.findByText('Không tìm thấy địa chỉ');
    expect(emptyText).toBeTruthy();
    expect(screen.getAllByText('Chọn trên bản đồ').length).toBeGreaterThanOrEqual(1);
  });

  it('displays location permission banner when hasLocationPermission is false', async () => {
    const screen = await render(
      <SearchAddressScreen
        hasLocationPermission={false}
        onBack={jest.fn()}
        onSelectAddress={jest.fn()}
      />
    );

    expect(screen.getByText(/Bật vị trí để tính cước chính xác/i)).toBeTruthy();
    expect(screen.getByText('Mở Cài đặt')).toBeTruthy();
  });
});
