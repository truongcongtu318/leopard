import { describe, expect, test, jest, beforeEach } from '@jest/globals';
import { BadRequestException } from '@nestjs/common';
import { PaymentWebhookService } from './payment-webhook.service.js';

describe('PaymentWebhookService', () => {
  let service: PaymentWebhookService;
  let payOsProvider: any;
  let repo: any;
  let prisma: any;
  let auditService: any;

  const webhookPayload = { code: '00', desc: 'success', success: true, data: {}, signature: 'sig' };
  const verifiedData = {
    orderCode: 123456,
    amount: 286000,
    description: 'LP12345678',
    accountNumber: '113366668888',
    reference: 'TF230204212323',
    transactionDateTime: '2026-09-05 18:25:00',
    currency: 'VND',
    paymentLinkId: 'link-1',
    code: '00',
    desc: 'Thành công',
  };

  beforeEach(() => {
    payOsProvider = { verifyWebhook: jest.fn() };
    repo = {
      findByPayosOrderCode: jest.fn(),
      updateStatus: jest.fn(),
    };
    prisma = { $transaction: jest.fn((cb) => cb(prisma)) };
    auditService = { append: jest.fn() };
    service = new PaymentWebhookService(payOsProvider, repo, prisma, auditService);
  });

  test('ignores webhook when payOS provider is not configured', async () => {
    service = new PaymentWebhookService(null, repo, prisma, auditService);
    await service.handlePayosWebhook(webhookPayload);
    expect(repo.findByPayosOrderCode).not.toHaveBeenCalled();
  });

  test('rejects an invalid signature with 400', async () => {
    payOsProvider.verifyWebhook.mockRejectedValue(new Error('invalid signature'));
    await expect(service.handlePayosWebhook(webhookPayload)).rejects.toThrow(BadRequestException);
    expect(repo.findByPayosOrderCode).not.toHaveBeenCalled();
  });

  test('logs and no-ops when orderCode matches no PaymentIntent', async () => {
    payOsProvider.verifyWebhook.mockResolvedValue(verifiedData);
    repo.findByPayosOrderCode.mockResolvedValue(null);
    await service.handlePayosWebhook(webhookPayload);
    expect(repo.updateStatus).not.toHaveBeenCalled();
  });

  test('is idempotent when the intent is already PAID_MANUAL', async () => {
    payOsProvider.verifyWebhook.mockResolvedValue(verifiedData);
    repo.findByPayosOrderCode.mockResolvedValue({
      id: 'intent1',
      status: 'PAID_MANUAL',
      amountVnd: 286000,
    });
    await service.handlePayosWebhook(webhookPayload);
    expect(repo.updateStatus).not.toHaveBeenCalled();
    expect(auditService.append).not.toHaveBeenCalled();
  });

  test('does not confirm when the webhook amount does not match the intent', async () => {
    payOsProvider.verifyWebhook.mockResolvedValue(verifiedData);
    repo.findByPayosOrderCode.mockResolvedValue({
      id: 'intent1',
      status: 'QR_CREATED',
      amountVnd: 999999,
    });
    await service.handlePayosWebhook(webhookPayload);
    expect(repo.updateStatus).not.toHaveBeenCalled();
  });

  test('confirms payment and writes an audit log on a valid webhook', async () => {
    payOsProvider.verifyWebhook.mockResolvedValue(verifiedData);
    repo.findByPayosOrderCode.mockResolvedValue({
      id: 'intent1',
      status: 'QR_CREATED',
      amountVnd: 286000,
    });
    repo.updateStatus.mockResolvedValue({ id: 'intent1', status: 'PAID_MANUAL' });

    await service.handlePayosWebhook(webhookPayload);

    expect(repo.updateStatus).toHaveBeenCalledWith(
      'intent1',
      expect.objectContaining({
        status: 'PAID_MANUAL',
        providerReference: verifiedData.reference,
        confirmationNote: 'Xác nhận tự động qua webhook payOS',
      }),
      prisma,
    );
    expect(auditService.append).toHaveBeenCalledWith(
      expect.objectContaining({
        actorId: null,
        action: 'CONFIRM_PAYMENT_WEBHOOK',
        resourceType: 'PaymentIntent',
        resourceId: 'intent1',
        idempotencyRequestId: 'payos-webhook-123456',
      }),
      prisma,
    );
  });
});
