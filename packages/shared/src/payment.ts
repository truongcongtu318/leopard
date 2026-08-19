import type { PaymentStatus, ProviderSource } from './enums.js';

export interface PaymentIntent {
  id: string;
  orderId: string;
  provider: ProviderSource;
  status: PaymentStatus;
  amountVnd: number;
  qrPayload?: string | null;
  providerSnapshot?: Record<string, unknown> | null;
  expiresAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePaymentQrRequest {
  orderId: string;
  amountVnd?: number;
}

export interface PaymentQrResponse {
  paymentId: string;
  orderId: string;
  qrPayload: string;
  amountVnd: number;
  status: PaymentStatus;
  provider: ProviderSource;
  expiresAt: string;
  referenceLabel?: string;
}
