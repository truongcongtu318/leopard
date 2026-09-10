import { describe, expect, test, jest } from '@jest/globals';
import {
  DemoPaymentProvider,
  PayOsPaymentProvider,
  formatShortOrderReference,
  generatePayosOrderCode,
  type PayOsClientLike,
} from './payment.provider.js';

describe('generatePayosOrderCode', () => {
  test('returns a positive integer that fits a safe JS/Postgres bigint value', () => {
    const code = generatePayosOrderCode();
    expect(Number.isSafeInteger(code)).toBe(true);
    expect(code).toBeGreaterThan(0);
  });

  test('generates distinct codes across calls', () => {
    const codes = new Set(Array.from({ length: 20 }, () => generatePayosOrderCode()));
    expect(codes.size).toBe(20);
  });
});

describe('formatShortOrderReference', () => {
  test('matches the LP-XXXXXXXX reference shown in the mobile app', () => {
    expect(formatShortOrderReference('11111111-2222-3333-4444-555555555555')).toBe('LP11111111');
  });
});

describe('DemoPaymentProvider', () => {
  test('returns a fake, non-payos QR payload', async () => {
    const provider = new DemoPaymentProvider();
    const result = await provider.createQr({ amountVnd: 10_000, orderId: 'order1', idempotencyKey: 'req1' });
    expect(result.provider).toBe('DEMO');
    expect(result.payosOrderCode).toBeUndefined();
  });
});

function createFakePayOsClient(): PayOsClientLike & {
  paymentRequests: { create: jest.Mock };
  webhooks: { verify: jest.Mock };
} {
  return {
    paymentRequests: { create: jest.fn() },
    webhooks: { verify: jest.fn() },
  };
}

describe('PayOsPaymentProvider', () => {
  const config = {
    clientId: 'client',
    apiKey: 'key',
    checksumKey: 'checksum',
    returnUrl: 'https://leopard.vn/return',
    cancelUrl: 'https://leopard.vn/cancel',
  };

  test('createQr calls payOS with the real order amount and a generated orderCode, and returns a scannable qrPayload', async () => {
    const client = createFakePayOsClient();
    client.paymentRequests.create.mockResolvedValue({
      bin: '970422',
      accountNumber: '113366668888',
      accountName: 'LEOPARD',
      amount: 286000,
      description: 'LP12345678',
      orderCode: 999,
      currency: 'VND',
      paymentLinkId: 'link-1',
      status: 'PENDING',
      checkoutUrl: 'https://pay.payos.vn/web/link-1',
      qrCode: '00020101021238570010A000000727012700069704220113113366668888',
    });

    const provider = new PayOsPaymentProvider(config, client);
    const result = await provider.createQr({
      amountVnd: 286000,
      orderId: '12345678-aaaa-bbbb-cccc-dddddddddddd',
      idempotencyKey: 'req1',
    });

    expect(client.paymentRequests.create).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: 286000,
        description: 'LP12345678',
        cancelUrl: config.cancelUrl,
        returnUrl: config.returnUrl,
      }),
    );
    expect(result.provider).toBe('PAYOS');
    expect(result.qrPayload).toBe('00020101021238570010A000000727012700069704220113113366668888');
    expect(result.providerReference).toBe('link-1');
    expect(typeof result.payosOrderCode).toBe('bigint');
  });

  test('verifyWebhook delegates to the payOS SDK and surfaces its verified data', async () => {
    const client = createFakePayOsClient();
    const verifiedData = { orderCode: 999, amount: 286000 };
    client.webhooks.verify.mockResolvedValue(verifiedData);

    const provider = new PayOsPaymentProvider(config, client);
    const payload = { code: '00', desc: 'success', success: true, data: {}, signature: 'sig' };
    const result = await provider.verifyWebhook(payload);

    expect(client.webhooks.verify).toHaveBeenCalledWith(payload);
    expect(result).toBe(verifiedData);
  });

  test('verifyWebhook propagates signature verification failures', async () => {
    const client = createFakePayOsClient();
    client.webhooks.verify.mockRejectedValue(new Error('invalid signature'));
    const provider = new PayOsPaymentProvider(config, client);
    await expect(provider.verifyWebhook({})).rejects.toThrow('invalid signature');
  });
});
