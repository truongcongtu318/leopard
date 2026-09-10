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

export interface PaymentIntentDto {
  id: string;
  orderId: string;
  provider: ProviderSource | null;
  status: PaymentStatus;
  amountVnd: number;
  clientRequestId?: string;
  providerReference?: string;
  qrPayload?: string;
  expiresAt?: string;
  confirmedById?: string;
  confirmedAt?: string;
  confirmationNote?: string;
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

export interface PaymentQrDto {
  amountVnd: number;
  provider: ProviderSource;
  providerReference: string;
  expiresAt: string;
  qrPayload: string;
}

export interface CreatePaymentIntentRequest {
  readonly clientRequestId: string;
}

export interface AdminConfirmPaymentRequest {
  readonly note: string;
  readonly clientRequestId: string;
}

