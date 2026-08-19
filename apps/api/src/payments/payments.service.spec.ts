import { describe, expect, test, jest, beforeEach } from '@jest/globals';
import { PaymentsService } from './payments.service.js';
import { DemoPaymentProvider } from './payment.provider.js';
import { DomainError } from '../common/domain-error.js';

describe('PaymentsService', () => {
  let service: PaymentsService;
  let repo: any;
  let provider: any;
  let prisma: any;
  let ordersRepo: any;
  let auditService: any;
  let adminActor = { userId: 'admin1', role: 'ADMIN' as const };
  let customerActor = { userId: 'cust1', role: 'CUSTOMER' as const };

  beforeEach(() => {
    repo = {
      findByClientRequestId: jest.fn(),
      findByConfirmationRequestId: jest.fn(),
      findActiveIntent: jest.fn(),
      create: jest.fn(),
      updateStatus: jest.fn(),
      findById: jest.fn(),
      findByOrderId: jest.fn(),
    };
    provider = new DemoPaymentProvider();
    prisma = {
      $transaction: jest.fn((cb) => cb(prisma)),
    };
    ordersRepo = {
      findById: jest.fn(),
    };
    auditService = {
      append: jest.fn(),
    };
    service = new PaymentsService(repo, provider, prisma, ordersRepo, auditService);
  });

  test('create intent with same clientRequestId returns existing', async () => {
    ordersRepo.findById.mockResolvedValue({ id: 'order1', customerId: 'cust1', price: 100 });
    repo.findByClientRequestId.mockResolvedValue({ id: 'intent1' });
    const res = await service.createPaymentIntent(customerActor, 'order1', 'req1');
    expect(res.id).toBe('intent1');
  });

  test('create intent conflict returns 409', async () => {
    ordersRepo.findById.mockResolvedValue({ id: 'order1', customerId: 'cust1', price: 100 });
    repo.findByClientRequestId.mockResolvedValue(null);
    repo.findActiveIntent.mockResolvedValue({ id: 'intent1', clientRequestId: 'req2' });
    await expect(service.createPaymentIntent(customerActor, 'order1', 'req1')).rejects.toThrow(DomainError);
  });

  test('create intent flow with mocked provider', async () => {
    ordersRepo.findById.mockResolvedValue({ id: 'order1', customerId: 'cust1', price: 100 });
    repo.findByClientRequestId.mockResolvedValue(null);
    repo.findActiveIntent.mockResolvedValue(null);
    repo.create.mockResolvedValue({ id: 'intent1', status: 'UNPAID' });
    repo.updateStatus.mockResolvedValue({ id: 'intent1', status: 'QR_CREATED' });

    const res = await service.createPaymentIntent(customerActor, 'order1', 'req1');
    expect(res.status).toBe('QR_CREATED');
    expect(repo.create).toHaveBeenCalled();
    expect(repo.updateStatus).toHaveBeenCalled();
  });

  test('provider failure sets FAILED status', async () => {
    ordersRepo.findById.mockResolvedValue({ id: 'order1', customerId: 'cust1', price: 100 });
    repo.findByClientRequestId.mockResolvedValue(null);
    repo.findActiveIntent.mockResolvedValue(null);
    repo.create.mockResolvedValue({ id: 'intent1', status: 'UNPAID' });
    jest.spyOn(provider, 'createQr').mockRejectedValue(new Error('fail'));
    
    await expect(service.createPaymentIntent(customerActor, 'order1', 'req1')).rejects.toThrow(DomainError);
    expect(repo.updateStatus).toHaveBeenCalledWith('intent1', { status: 'FAILED' }, prisma);
  });

  test('confirm flow with audit', async () => {
    repo.findByConfirmationRequestId.mockResolvedValue(null);
    repo.findById.mockResolvedValue({ id: 'payment1', status: 'UNPAID' });
    repo.updateStatus.mockResolvedValue({ id: 'payment1', status: 'PAID_MANUAL' });

    const res = await service.confirmPayment(adminActor, 'payment1', 'good note', 'req1');
    expect(res.status).toBe('PAID_MANUAL');
    expect(auditService.append).toHaveBeenCalled();
  });

  test('confirm idempotency', async () => {
    repo.findByConfirmationRequestId.mockResolvedValue({ id: 'payment1', status: 'PAID_MANUAL' });
    const res = await service.confirmPayment(adminActor, 'payment1', 'good note', 'req1');
    expect(res.status).toBe('PAID_MANUAL');
  });

  test('confirm with invalid note length', async () => {
    await expect(service.confirmPayment(adminActor, 'payment1', 'bad ', 'req1')).rejects.toThrow(DomainError);
  });

  test('non-admin cannot confirm', async () => {
    await expect(service.confirmPayment(customerActor, 'payment1', 'good note', 'req1')).rejects.toThrow(DomainError);
  });

  test('payment history authorization', async () => {
    ordersRepo.findById.mockResolvedValue({ id: 'order1', customerId: 'otherCust' });
    await expect(service.getPaymentHistory(customerActor, 'order1')).rejects.toThrow(DomainError);
  });
});
