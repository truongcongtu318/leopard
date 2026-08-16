import type { PaymentStatus, ProviderSource } from './enums.js';

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
