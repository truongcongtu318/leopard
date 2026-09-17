import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render } from '@testing-library/react-native';
import React from 'react';
import { BookingLocationSearchOverlay } from './BookingLocationSearchOverlay';

describe('BookingLocationSearchOverlay (Grab style)', () => {
  it('renders search input and "Chọn trên bản đồ" when visible', async () => {
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
    expect(screen.getByText('Chọn vị trí chính xác trên bản đồ')).toBeTruthy();
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

    const input = screen.getByPlaceholderText('Nhập địa chỉ giao hàng...');
    fireEvent.changeText(input, 'Bến Thành');

    const resultItem = await screen.findByText('Chợ Bến Thành');
    expect(resultItem).toBeTruthy();

    fireEvent.press(resultItem);
    expect(onSelect).toHaveBeenCalledWith(
      expect.stringContaining('Bến Thành'),
      undefined,
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
