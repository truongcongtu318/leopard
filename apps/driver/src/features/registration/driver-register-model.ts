import * as SecureStore from 'expo-secure-store';
import { ApiError } from '@leopard/mobile-core';

export type VehicleOption = 'VAN_500KG' | 'TRUCK_1250KG' | 'TRUCK_2500KG' | 'TRICYCLE_500KG';

export interface VehicleDefinition {
  readonly id: VehicleOption;
  readonly label: string;
  readonly subLabel: string;
  readonly defaultPayloadKg: number;
  readonly backendType: 'VAN' | 'TRUCK' | 'MOTORBIKE';
}

export const VEHICLE_OPTIONS: readonly VehicleDefinition[] = [
  {
    id: 'VAN_500KG',
    label: 'Xe Van 500kg',
    subLabel: 'Tải trọng 500kg',
    defaultPayloadKg: 500,
    backendType: 'VAN',
  },
  {
    id: 'TRUCK_1250KG',
    label: 'Xe Tải nhẹ 1.25T',
    subLabel: 'Thùng bạt / Thùng kín',
    defaultPayloadKg: 1250,
    backendType: 'TRUCK',
  },
  {
    id: 'TRUCK_2500KG',
    label: 'Xe Tải 2.5T',
    subLabel: 'Đường dài, tải trọng lớn',
    defaultPayloadKg: 2500,
    backendType: 'TRUCK',
  },
  {
    id: 'TRICYCLE_500KG',
    label: 'Xe Ba gác',
    subLabel: 'Nội đô ngõ hẻm',
    defaultPayloadKg: 500,
    backendType: 'MOTORBIKE',
  },
];

export const CITIES = ['TP. Hồ Chí Minh', 'Hà Nội', 'Đà Nẵng', 'Bình Dương', 'Khác'] as const;

export type DocType = 'LICENSE' | 'VEHICLE_REGISTRATION' | 'ID_CARD';

export const DOC_SLOTS: readonly { readonly type: DocType; readonly label: string; readonly hint: string }[] = [
  { type: 'LICENSE', label: 'Giấy phép lái xe (GPLX)', hint: 'GPLX B2 / C (Mặt trước + Mặt sau)' },
  { type: 'VEHICLE_REGISTRATION', label: 'Cà-vẹt / Đăng ký xe', hint: 'Cà vẹt xe / Giấy đăng ký xe & Đăng kiểm' },
  { type: 'ID_CARD', label: 'CCCD / CMND', hint: 'CCCD / Căn cước (Mặt trước + Mặt sau)' },
];

export const DRAFT_STORAGE_KEY = '@leopard/driver_register_draft';

export interface DriverRegisterDraft {
  fullName?: string;
  phoneNumber?: string;
  birthDate?: string;
  address?: string;
  city?: string;
  fleetCode?: string;
  selectedVehicle?: VehicleOption;
  licensePlate?: string;
  payloadKg?: string;
  licenseNumber?: string;
  signatureName?: string;
}

let memoryDraft: string | null = null;

export const draftStorage = {
  async getDraft(): Promise<DriverRegisterDraft | null> {
    try {
      let raw: string | null = null;
      if (typeof window !== 'undefined' && window.localStorage) {
        raw = window.localStorage.getItem(DRAFT_STORAGE_KEY);
      }
      if (!raw && typeof globalThis !== 'undefined' && (globalThis as any).localStorage) {
        raw = (globalThis as any).localStorage.getItem(DRAFT_STORAGE_KEY);
      }
      if (!raw) {
        try {
          const available = await SecureStore.isAvailableAsync();
          if (available) {
            raw = await SecureStore.getItemAsync(DRAFT_STORAGE_KEY);
          }
        } catch {
          // ignore
        }
      }
      if (!raw) {
        raw = memoryDraft;
      }
      return raw ? (JSON.parse(raw) as DriverRegisterDraft) : null;
    } catch {
      return null;
    }
  },

  async saveDraft(draft: DriverRegisterDraft): Promise<void> {
    try {
      const raw = JSON.stringify(draft);
      memoryDraft = raw;
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(DRAFT_STORAGE_KEY, raw);
      }
      if (typeof globalThis !== 'undefined' && (globalThis as any).localStorage) {
        (globalThis as any).localStorage.setItem(DRAFT_STORAGE_KEY, raw);
      }
      try {
        const available = await SecureStore.isAvailableAsync();
        if (available) {
          await SecureStore.setItemAsync(DRAFT_STORAGE_KEY, raw);
        }
      } catch {
        // ignore
      }
    } catch {
      // ignore
    }
  },

  async clearDraft(): Promise<void> {
    try {
      memoryDraft = null;
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(DRAFT_STORAGE_KEY);
      }
      if (typeof globalThis !== 'undefined' && (globalThis as any).localStorage) {
        (globalThis as any).localStorage.removeItem(DRAFT_STORAGE_KEY);
      }
      try {
        const available = await SecureStore.isAvailableAsync();
        if (available) {
          await SecureStore.deleteItemAsync(DRAFT_STORAGE_KEY);
        }
      } catch {
        // ignore
      }
    } catch {
      // ignore
    }
  },
};

export function isValidPlate(plate: string): boolean {
  const trimmed = plate.trim().toUpperCase();
  if (trimmed.length < 4) return false;
  return /^[0-9]{2}[A-Z0-9][-.\s]?[0-9]{3,6}(\.[0-9]{2})?$/i.test(trimmed);
}

export function newRequestId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `req-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }
}

export function formatSignedAt(iso: string): string {
  try {
    return new Date(iso).toLocaleString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

/** Maps a failed `POST /driver/apply` error to the Vietnamese user-facing message. */
export function mapApplyError(err: unknown): string {
  const statusCode = (err as { statusCode?: number })?.statusCode ?? 0;
  const code = (err as { code?: string })?.code;
  const message = (err as { message?: string })?.message;

  if (statusCode === 401) {
    return 'Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại';
  }
  if (code === 'CONTRACT_NOT_ACCEPTED') {
    return message ?? 'Bạn cần đồng ý với hợp đồng tài xế trước khi đăng ký';
  }
  if (code === 'SIGNATURE_INVALID') {
    return message ?? 'Chữ ký không hợp lệ, vui lòng nhập lại họ tên xác nhận';
  }
  if (err instanceof ApiError && statusCode >= 400 && statusCode < 500) {
    return message ?? 'Thông tin đăng ký chưa hợp lệ';
  }
  return message ?? 'Đã xảy ra lỗi khi gửi hồ sơ, vui lòng thử lại';
}
