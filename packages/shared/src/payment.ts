export const paymentStatuses = ["UNPAID", "QR_CREATED", "PAID_DEMO", "FAILED"] as const;

export type PaymentStatus = (typeof paymentStatuses)[number];

export const paymentProviders = ["DEMO", "VIETQR", "PAYOS"] as const;

export type PaymentProvider = (typeof paymentProviders)[number];

export interface PaymentIntentDto {
  id: string;
  orderId: string;
  status: PaymentStatus;
  provider: PaymentProvider;
  amountVnd: number;
  qrContent: string;
  providerReference: string | null;
  createdAt: string;
}
