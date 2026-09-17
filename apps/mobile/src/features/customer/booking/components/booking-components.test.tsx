import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { BookingVehicleSection } from './BookingVehicleSection';
import { BookingServicesSection } from './BookingServicesSection';
import { BookingFixedBottomBar } from './BookingFixedBottomBar';
import { BookingRouteSection } from './BookingRouteSection';
import { BookingReceiverSection } from './BookingReceiverSection';
import { PriceDetailModal } from './PriceDetailModal';

describe('Booking Modular Components', () => {
  it('BookingVehicleSection renders vehicles and selects via checkmark without radio buttons', async () => {
    const onSelect = jest.fn();
    const screen = await render(
      <BookingVehicleSection selectedVehicleId="TRUCK_125T" onSelectVehicle={onSelect} />
    );

    expect(screen.getByText('Xe Tải 1.25 Tấn')).toBeTruthy();
    expect(screen.getByText('200.000 đ')).toBeTruthy();
    expect(screen.queryByRole('radio')).toBeNull();

    fireEvent.press(screen.getByText('Xe Tải 2.5 Tấn'));
    expect(onSelect).toHaveBeenCalledWith('TRUCK_25T');
  });

  it('BookingRouteSection renders pickup with Kho tag, dropoff, and handles stops', async () => {
    const onAddStop = jest.fn();
    const screen = await render(
      <BookingRouteSection
        pickupAddress="Kho VLXD Đại Phát - 120 Song Hành"
        dropoffAddress="Công trình Jamona City, Đào Trí"
        stops={[]}
        distanceKm={12.5}
        etaMinutes={35}
        onAddStop={onAddStop}
        onRemoveStop={jest.fn()}
      />
    );

    expect(screen.getByText('Kho VLXD Đại Phát - 120 Song Hành')).toBeTruthy();
    expect(screen.getByText('Công trình Jamona City, Đào Trí')).toBeTruthy();
    expect(screen.getByText('Kho')).toBeTruthy();
    expect(screen.getByText(/Khoảng 12,5 km · dự kiến 35 phút/i)).toBeTruthy();

    fireEvent.press(screen.getByText('+ Thêm điểm dừng'));
    expect(onAddStop).toHaveBeenCalled();
  });

  it('BookingReceiverSection formats phone and shows validation errors', async () => {
    const onChangePhone = jest.fn();
    const screen = await render(
      <BookingReceiverSection
        receiverName="Anh Tuấn"
        receiverPhone="90 123 4567"
        onChangeName={jest.fn()}
        onChangePhone={onChangePhone}
        nameError="Vui lòng nhập họ và tên người nhận"
        phoneError="Số điện thoại không hợp lệ"
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
        onToggleLoading={jest.fn()}
        onToggleVat={onToggleVat}
        vatCompany=""
        vatTaxId=""
        vatEmail=""
        onChangeVatField={jest.fn()}
      />
    );

    expect(screen.getByText('Xuất hóa đơn VAT')).toBeTruthy();
    expect(screen.queryByPlaceholderText('Tên công ty')).toBeNull();
  });

  it('BookingFixedBottomBar disables CTA button when isValid is false', async () => {
    const onBook = jest.fn();
    const screen = await render(
      <BookingFixedBottomBar
        totalFare={200_000}
        isValid={false}
        onPressBook={onBook}
        onPressDetails={jest.fn()}
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
        visible={true}
        onClose={onClose}
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
      />
    );

    expect(screen.getByText('Chi tiết cước vận chuyển')).toBeTruthy();
    expect(screen.getByText('378.000 đ')).toBeTruthy();

    fireEvent.press(screen.getByText('ĐÃ HIỂU'));
    expect(onClose).toHaveBeenCalled();
  });
});
