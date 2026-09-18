import { describe, expect, it } from '@jest/globals';
import { validateBookingForm, type BookingDraftState } from './booking-schema';

describe('validateBookingForm', () => {
  const validDraft: BookingDraftState = {
    pickupAddress: 'Kho VLXD Đại Phát, 120 Song Hành, Q.12',
    dropoffAddress: 'Công trình Jamona City, Đào Trí, Q.7',
    stops: [],
    vehicleId: 'TRUCK_125T',
    receiverName: 'Anh Tuấn',
    receiverPhone: '90 123 4567',
    cargoCategory: 'Vật liệu XD',
    cargoNote: '40 bao xi măng INSEE',
    cargoImages: ['file:///img1.jpg'],
    hasLoadingSupport: true,
    hasVatInvoice: false,
    paymentMethod: 'VIETQR',
  };

  it('returns valid when all required fields are satisfied', () => {
    const result = validateBookingForm(validDraft);
    expect(result.isValid).toBe(true);
    expect(Object.keys(result.errors).length).toBe(0);
  });

  it('detects error when pickup and dropoff addresses are identical', () => {
    const result = validateBookingForm({
      ...validDraft,
      dropoffAddress: validDraft.pickupAddress,
    });
    expect(result.isValid).toBe(false);
    expect(result.errors.route).toBe('Điểm giao hàng không được trùng với điểm lấy hàng');
  });

  it('detects missing receiver name', () => {
    const result = validateBookingForm({
      ...validDraft,
      receiverName: '   ',
    });
    expect(result.isValid).toBe(false);
    expect(result.errors.receiverName).toBe('Vui lòng nhập họ và tên người nhận');
  });

  it('detects invalid receiver phone number', () => {
    const result = validateBookingForm({
      ...validDraft,
      receiverPhone: '90 123',
    });
    expect(result.isValid).toBe(false);
    expect(result.errors.receiverPhone).toBe('Số điện thoại không hợp lệ (cần đủ 9 chữ số)');
  });

  it('enforces VAT invoice fields when hasVatInvoice is true', () => {
    const result = validateBookingForm({
      ...validDraft,
      hasVatInvoice: true,
      vatCompany: '',
      vatTaxId: '',
      vatEmail: 'invalid-email',
    });
    expect(result.isValid).toBe(false);
    expect(result.errors.vatCompany).toBe('Vui lòng nhập tên công ty');
    expect(result.errors.vatTaxId).toBe('Vui lòng nhập mã số thuế');
    expect(result.errors.vatEmail).toBe('Email nhận hóa đơn không hợp lệ');
  });

  it('enforces at least one cargo image as mandatory', () => {
    const result = validateBookingForm({
      ...validDraft,
      cargoImages: [],
    });
    expect(result.isValid).toBe(false);
    expect(result.errors.cargoImages).toBe('Vui lòng thêm ít nhất 1 ảnh hàng hóa');
  });
});
