import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render } from '@testing-library/react-native';
import React from 'react';
import { searchVietmapWithCoords } from '../../../home/services/vietmap-search';
import { BookingLocationSearchOverlay } from './BookingLocationSearchOverlay';

// The picker is fed only by the real VietMap autocomplete API.
jest.mock('../../../home/services/vietmap-search', () => ({
  searchVietmapWithCoords: jest.fn(),
}));

describe('BookingLocationSearchOverlay (Grab style)', () => {
  beforeEach(() => {
    jest.mocked(searchVietmapWithCoords).mockReset();
  });

  it('renders search input and "Chọn vị trí hiện tại" when visible', async () => {
    const onClose = jest.fn();
    const onSelect = jest.fn();

    const screen = await render(
      <BookingLocationSearchOverlay
        currentValue=""
        onClose={onClose}
        onSelectLocation={onSelect}
        target="dropoff"
        visible={true}
      />
    );

    expect(screen.getByPlaceholderText('Nhập địa chỉ giao hàng...')).toBeTruthy();
    expect(screen.getByText('Chọn vị trí hiện tại')).toBeTruthy();
  });

  it('searches locations when typing and selects location', async () => {
    const onSelect = jest.fn();
    const onClose = jest.fn();

    const screen = await render(
      <BookingLocationSearchOverlay
        currentValue=""
        onClose={onClose}
        onSelectLocation={onSelect}
        target="dropoff"
        visible={true}
      />
    );

    jest.mocked(searchVietmapWithCoords).mockResolvedValue([
      {
        id: 'vm-1',
        title: 'Chợ Bến Thành',
        subtitle: 'Lê Lợi, Quận 1',
        address: 'Chợ Bến Thành, Lê Lợi, Quận 1, TP. Hồ Chí Minh',
        coords: { lat: 10.7725, lng: 106.698 },
      },
    ]);

    const input = screen.getByPlaceholderText('Nhập địa chỉ giao hàng...');
    fireEvent.changeText(input, 'Bến Thành');

    const resultItem = await screen.findByText('Chợ Bến Thành');
    expect(resultItem).toBeTruthy();

    fireEvent.press(resultItem);
    // The picked suggestion carries its real coordinates through to the caller.
    expect(onSelect).toHaveBeenCalledWith(
      expect.stringContaining('Bến Thành'),
      { lat: 10.7725, lng: 106.698 },
    );
    expect(onClose).toHaveBeenCalled();
  });

  it('handles pickup target label correctly', async () => {
    const screen = await render(
      <BookingLocationSearchOverlay
        currentValue=""
        onClose={jest.fn()}
        onSelectLocation={jest.fn()}
        target="pickup"
        visible={true}
      />
    );

    expect(screen.getByPlaceholderText('Nhập địa chỉ lấy hàng...')).toBeTruthy();
    expect(screen.getByText('Điểm lấy hàng')).toBeTruthy();
  });
});
