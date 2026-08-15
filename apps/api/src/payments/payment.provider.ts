import { ProviderSource } from '@prisma/client';

export interface PaymentRequest {
  amountVnd: number;
  orderId: string;
  idempotencyKey: string;
}

export interface PaymentQr {
  provider: ProviderSource;
  providerReference: string;
  qrPayload: string;
  expiresAt: Date;
}

export abstract class PaymentProvider {
  abstract createQr(input: PaymentRequest): Promise<PaymentQr>;
}

export class DemoPaymentProvider extends PaymentProvider {
  async createQr(input: PaymentRequest): Promise<PaymentQr> {
    return {
      provider: 'DEMO',
      providerReference: `DEMO-${input.orderId}-${input.idempotencyKey}`,
      qrPayload: JSON.stringify({ amount: input.amountVnd, provider: 'DEMO' }),
      expiresAt: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes
    };
  }
}

export class PayOsPaymentProvider extends PaymentProvider {
  async createQr(input: PaymentRequest): Promise<PaymentQr> {
    throw new Error('PayOS not configured');
  }
}

export class VietQrPaymentProvider extends PaymentProvider {
  async createQr(input: PaymentRequest): Promise<PaymentQr> {
    throw new Error('VietQR not configured');
  }
}
