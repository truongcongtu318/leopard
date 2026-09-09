import { PayOS } from '@payos/node';
import type { CreatePaymentLinkResponse, Webhook, WebhookData } from '@payos/node';
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
  payosOrderCode?: bigint;
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

export interface PayOsProviderConfig {
  clientId: string;
  apiKey: string;
  checksumKey: string;
  returnUrl: string;
  cancelUrl: string;
  expiresInMs?: number;
}

const PAYOS_DEFAULT_EXPIRY_MS = 15 * 60 * 1000; // payOS QR/checkout links are meant to be short-lived

/**
 * The slice of the @payos/node client this provider actually calls. Depending
 * on this narrow interface (rather than the concrete PayOS class) lets tests
 * inject a fake client directly instead of mocking the SDK module.
 */
export interface PayOsClientLike {
  paymentRequests: {
    create: (data: {
      orderCode: number;
      amount: number;
      description: string;
      cancelUrl: string;
      returnUrl: string;
      expiredAt?: number;
    }) => Promise<CreatePaymentLinkResponse>;
  };
  webhooks: {
    verify: (payload: Webhook) => Promise<WebhookData>;
  };
}

/**
 * Real payOS integration. orderCode must be a payOS-unique positive integer —
 * it has nothing to do with our internal UUIDs, so we generate one and persist
 * it on the PaymentIntent (payosOrderCode) to look the intent back up when the
 * webhook arrives with only that numeric code.
 */
export class PayOsPaymentProvider extends PaymentProvider {
  private readonly client: PayOsClientLike;
  private readonly returnUrl: string;
  private readonly cancelUrl: string;
  private readonly expiresInMs: number;

  constructor(config: PayOsProviderConfig, client?: PayOsClientLike) {
    super();
    this.client =
      client ??
      new PayOS({
        clientId: config.clientId,
        apiKey: config.apiKey,
        checksumKey: config.checksumKey,
      });
    this.returnUrl = config.returnUrl;
    this.cancelUrl = config.cancelUrl;
    this.expiresInMs = config.expiresInMs ?? PAYOS_DEFAULT_EXPIRY_MS;
  }

  async createQr(input: PaymentRequest): Promise<PaymentQr> {
    const orderCode = generatePayosOrderCode();
    const expiresAt = new Date(Date.now() + this.expiresInMs);

    const response = await this.client.paymentRequests.create({
      orderCode,
      amount: input.amountVnd,
      description: formatShortOrderReference(input.orderId),
      cancelUrl: this.cancelUrl,
      returnUrl: this.returnUrl,
      expiredAt: Math.floor(expiresAt.getTime() / 1000),
    });

    return {
      provider: 'PAYOS',
      providerReference: response.paymentLinkId,
      qrPayload: response.qrCode,
      expiresAt,
      payosOrderCode: BigInt(orderCode),
    };
  }

  /**
   * Verifies a payOS webhook payload's HMAC signature against our checksum key.
   * Throws when the signature is invalid — callers must treat that as a
   * rejected request, never as a confirmed payment.
   */
  async verifyWebhook(payload: unknown): Promise<WebhookData> {
    return this.client.webhooks.verify(payload as Webhook);
  }
}

export class VietQrPaymentProvider extends PaymentProvider {
  async createQr(input: PaymentRequest): Promise<PaymentQr> {
    throw new Error('VietQR not configured');
  }
}

let payosOrderCodeSequence = 0;

/**
 * payOS requires a positive integer, unique per payment link, that we can map
 * back to our PaymentIntent when the webhook arrives. A millisecond timestamp
 * alone can repeat within a tight loop, so it's combined with an in-process
 * counter (0-999, wrapping) rather than randomness — that guarantees no two
 * calls in the same process ever collide unless more than 1000 payment
 * intents are created within the same millisecond, while staying well within
 * a safe JS integer / Postgres bigint.
 */
export function generatePayosOrderCode(): number {
  payosOrderCodeSequence = (payosOrderCodeSequence + 1) % 1000;
  return Date.now() * 1000 + payosOrderCodeSequence;
}

/** Matches the LP-XXXXXXXX reference shown to the customer in the mobile app. */
export function formatShortOrderReference(orderId: string): string {
  return `LP${orderId.replace(/-/g, '').slice(0, 8).toUpperCase()}`;
}
