export const VehicleType = ['MOTORBIKE', 'VAN', 'TRUCK'] as const;
export type VehicleType = (typeof VehicleType)[number];

export interface VehicleOptionDetails {
  type: VehicleType;
  label: string;
  subLabel: string;
  icon: string;
  maxWeightKg: number;
}

export const VEHICLE_OPTIONS: readonly VehicleOptionDetails[] = [
  {
    type: 'MOTORBIKE',
    label: 'Xe máy',
    subLabel: 'Hàng nhỏ, bưu phẩm < 30kg',
    icon: '🛵',
    maxWeightKg: 30,
  },
  {
    type: 'VAN',
    label: 'Xe Van / Tải nhỏ',
    subLabel: 'Hàng đóng thùng < 1 tấn',
    icon: '📦',
    maxWeightKg: 1000,
  },
  {
    type: 'TRUCK',
    label: 'Xe tải',
    subLabel: 'Hàng cồng kềnh, tải trọng 1–3.5 tấn',
    icon: '🚛',
    maxWeightKg: 3500,
  },
];
