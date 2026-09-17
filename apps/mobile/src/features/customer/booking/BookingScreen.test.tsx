import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { BookingScreen } from './BookingScreen';
import { bookingDraftStore } from './bookingDraftStore';

describe('BookingScreen Full Page Flow', () => {
  beforeEach(() => {
    bookingDraftStore.reset();
  });

  it('renders default route, vehicle 1.25T, and 200,000 VND total fare', async () => {
    const screen = await render(
      <BookingScreen
        distanceKm={5.0}
        initialDropoff="Công trình Jamona City"
        initialPickup="Kho VLXD Đại Phát"
      />
    );

    expect((await screen.findAllByText('Kho VLXD Đại Phát')).length).toBeGreaterThan(0);
    expect((await screen.findAllByText('Công trình Jamona City')).length).toBeGreaterThan(0);
    expect((await screen.findAllByText('200.000 đ')).length).toBeGreaterThan(0);
  });

  it('recalculates fare live to 378,000 VND when loading (+150k) and VAT (+8%) are enabled', async () => {
    const screen = await render(
      <BookingScreen
        distanceKm={5.0}
        initialDropoff="Công trình Jamona City"
        initialPickup="Kho VLXD Đại Phát"
      />
    );

    // Toggle loading
    const loadingToggle = await screen.findByLabelText('Tài xế hỗ trợ bốc xếp');
    fireEvent(loadingToggle, 'valueChange', true);

    // Toggle VAT
    const vatToggle = await screen.findByLabelText('Xuất hóa đơn VAT');
    fireEvent(vatToggle, 'valueChange', true);

    // Base 200k + Loading 150k = 350k; VAT 8% = 28k => Total 378k
    const match = await screen.findAllByText('378.000 đ');
    expect(match.length).toBeGreaterThan(0);
  });

  it('opens Price Detail Sheet when "Chi tiết ⌵" is tapped', async () => {
    const screen = await render(
      <BookingScreen
        distanceKm={5.0}
        initialDropoff="Công trình Jamona City"
        initialPickup="Kho VLXD Đại Phát"
      />
    );

    const detailBtn = await screen.findByText('Chi tiết ⌵');
    fireEvent.press(detailBtn);
    expect(await screen.findByText('Chi tiết cước vận chuyển')).toBeTruthy();
  });
});
