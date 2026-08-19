export const PaymentStatus = ['UNPAID', 'QR_CREATED', 'PAID_MANUAL', 'FAILED'] as const;
export type PaymentStatus = (typeof PaymentStatus)[number];
