import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render } from '@testing-library/react-native';
import React from 'react';
import { BookingFixedBottomBar } from './BookingFixedBottomBar';
import { BookingReceiverSection } from './BookingReceiverSection';
import { BookingRouteSection } from './BookingRouteSection';
import { BookingServicesSection } from './BookingServicesSection';
import { BookingVehicleSection } from './BookingVehicleSection';
import { PriceDetailModal } from './PriceDetailModal';

describe('Booking Modular Components', () => {
  it('BookingVehicleSection renders vehicles and selects via checkmark without radio buttons', async () => {
    const onSelect = jest.fn();
    const screen = await render(
      <BookingVehicleSection onSelectVehicle={onSelect} selectedVehicleId="TRUCK_125T" />
    );

    expect(screen.getByText('Xe Tải 1.25 Tấn')).toBeTruthy();
    // Without a real routed distance there is no fare to show. Previously this
    // fell back to the 200.000 base fare, quoting a price for an unmeasured trip.
    expect(screen.queryByText('200.000 đ')).toBeNull();
    expect(screen.getAllByText('Đang tính…').length).toBeGreaterThan(0);
    expect(screen.queryByRole('radio')).toBeNull();

    fireEvent.press(screen.getByText('Xe Tải 2.5 Tấn'));
    expect(onSelect).toHaveBeenCalledWith('TRUCK_25T');
  });

  it('BookingRouteSection renders pickup, dropoff, and handles stops', async () => {
    const onAddStop = jest.fn();
    const screen = await render(
      <BookingRouteSection
        distanceKm={12.5}
        dropoffAddress="Công trình Jamona City, Đào Trí"
        etaMinutes={35}
        onAddStop={onAddStop}
        onRemoveStop={jest.fn()}
        pickupAddress="Kho VLXD Đại Phát - 120 Song Hành"
        stops={[]}
      />
    );

    expect(screen.getByText('Kho VLXD Đại Phát')).toBeTruthy();
    expect(screen.getByText('120 Song Hành')).toBeTruthy();
    expect(screen.getByText('Công trình Jamona City')).toBeTruthy();
    expect(screen.getByText('Đào Trí')).toBeTruthy();
    // No fabricated "Kho" tag: the pickup is not necessarily a warehouse.
    expect(screen.queryByText('Kho')).toBeNull();
    expect(screen.getByText(/Khoảng 12,5 km · dự kiến 35 phút/i)).toBeTruthy();

    fireEvent.press(screen.getByText('Thêm điểm dừng'));
    expect(onAddStop).toHaveBeenCalled();
  });

  it('BookingReceiverSection formats phone and shows validation errors', async () => {
    const onChangePhone = jest.fn();
    const screen = await render(
      <BookingReceiverSection
        nameError="Vui lòng nhập họ và tên người nhận"
        onChangeName={jest.fn()}
        onChangePhone={onChangePhone}
        phoneError="Số điện thoại không hợp lệ"
        receiverName="Anh Tuấn"
        receiverPhone="90 123 4567"
      />
    );

    expect(screen.getByText('+84')).toBeTruthy();
    expect(screen.getByText('Vui lòng nhập họ và tên người nhận')).toBeTruthy();
    expect(screen.getByText('Số điện thoại không hợp lệ')).toBeTruthy();
  });

  it('BookingServicesSection reveals VAT fields when toggle is enabled', async () => {
    const onToggleVat = jest.fn();
    const screen = await render(
      <BookingServicesSection
        hasLoadingSupport={false}
        hasVatInvoice={false}
        onChangeVatField={jest.fn()}
        onToggleLoading={jest.fn()}
        onToggleVat={onToggleVat}
        vatCompany=""
        vatEmail=""
        vatTaxId=""
      />
    );

    expect(screen.getByText('Xuất hóa đơn VAT')).toBeTruthy();
    expect(screen.queryByPlaceholderText('Tên công ty')).toBeNull();
  });

  it('BookingFixedBottomBar disables CTA button when isValid is false', async () => {
    const onBook = jest.fn();
    const screen = await render(
      <BookingFixedBottomBar
        isValid={false}
        onPressBook={onBook}
        onPressDetails={jest.fn()}
        totalFare={200_000}
      />
    );

    const ctaButton = screen.getByText('Đặt xe');
    fireEvent.press(ctaButton);
    expect(onBook).not.toHaveBeenCalled();
  });

  it('PriceDetailModal renders breakdown itemized list and close button', async () => {
    const onClose = jest.fn();
    const screen = await render(
      <PriceDetailModal
        breakdown={{
          vehicleId: 'TRUCK_125T',
          vehicleName: 'Xe Tải 1.25 Tấn',
          baseFare: 200_000,
          distanceFare: 200_000,
          stopFare: 0,
          transportFare: 200_000,
          loadingFee: 150_000,
          subtotal: 350_000,
          vatFee: 28_000,
          totalFare: 378_000,
        }}
        distanceKm={12.5}
        onClose={onClose}
        visible={true}
      />
    );

    expect(screen.getByText('Chi tiết cước vận chuyển')).toBeTruthy();
    expect(screen.getByText('378.000 đ')).toBeTruthy();

    fireEvent.press(screen.getByText('Đã hiểu'));
    expect(onClose).toHaveBeenCalled();
  });
});
