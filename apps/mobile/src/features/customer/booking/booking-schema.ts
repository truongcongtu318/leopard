import { formatVietnamPhoneNumber } from './phone-formatter';
import type { VehicleTypeId } from './booking-pricing';

export type CargoCategory = 'Kiện hàng' | 'May mặc' | 'Vật liệu XD' | 'Nội thất' | 'Khác';
export type PaymentMethod = 'VIETQR' | 'CASH';

export interface RouteStop {
  id: string;
  address: string;
  lat?: number;
  lng?: number;
}

export interface BookingDraftState {
  pickupAddress: string;
  pickupLat?: number;
  pickupLng?: number;
  dropoffAddress: string;
  dropoffLat?: number;
  dropoffLng?: number;
  stops: RouteStop[];
  vehicleId: VehicleTypeId;
  receiverName: string;
  receiverPhone: string;
  cargoCategory: CargoCategory;
  cargoNote?: string;
  cargoImages: string[];
  hasLoadingSupport: boolean;
  hasVatInvoice: boolean;
  vatCompany?: string;
  vatTaxId?: string;
  vatEmail?: string;
  paymentMethod: PaymentMethod;
}

export function validateBookingForm(draft: BookingDraftState): {
  isValid: boolean;
  errors: Record<string, string>;
} {
  const errors: Record<string, string> = {};

  if (!draft.pickupAddress.trim() || !draft.dropoffAddress.trim()) {
    errors.route = 'Vui lòng chọn đầy đủ điểm lấy và điểm giao';
  } else if (draft.pickupAddress.trim().toLowerCase() === draft.dropoffAddress.trim().toLowerCase()) {
    errors.route = 'Điểm giao hàng không được trùng với điểm lấy hàng';
  }

  if (!draft.receiverName.trim()) {
    errors.receiverName = 'Vui lòng nhập họ và tên người nhận';
  }

  const phoneCheck = formatVietnamPhoneNumber(draft.receiverPhone);
  if (!phoneCheck.isValid) {
    errors.receiverPhone = 'Số điện thoại không hợp lệ (cần đủ 9 chữ số)';
  }

  if (!draft.cargoImages || draft.cargoImages.length === 0) {
    errors.cargoImages = 'Vui lòng thêm ít nhất 1 ảnh hàng hóa';
  }

  if (draft.hasVatInvoice) {
    if (!draft.vatCompany?.trim()) {
      errors.vatCompany = 'Vui lòng nhập tên công ty';
    }
    if (!draft.vatTaxId?.trim()) {
      errors.vatTaxId = 'Vui lòng nhập mã số thuế';
    }
    const email = draft.vatEmail?.trim() ?? '';
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      errors.vatEmail = 'Email nhận hóa đơn không hợp lệ';
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}
