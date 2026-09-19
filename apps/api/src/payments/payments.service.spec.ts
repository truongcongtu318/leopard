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
  let notificationTriggers: any;
  let invoiceIssuancePort: any;
  let adminActor = { userId: 'admin1', role: 'ADMIN' as const };
  let customerActor = { userId: 'cust1', role: 'CUSTOMER' as const };
  let driverActor = { userId: 'drv1', role: 'DRIVER' as const };

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
    notificationTriggers = {
      notifyPaymentConfirmed: jest.fn().mockResolvedValue(undefined),
      notifyInvoiceEmailMissing: jest.fn().mockResolvedValue(undefined),
    };
    invoiceIssuancePort = {
      ensureInvoiceForPayment: jest.fn().mockResolvedValue(null),
    };
    service = new PaymentsService(
      repo,
      provider,
      prisma,
      ordersRepo,
      auditService,
      notificationTriggers,
      invoiceIssuancePort,
    );
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
    repo.findById.mockResolvedValue({ id: 'payment1', orderId: 'order1', amountVnd: 20000, status: 'UNPAID' });
    repo.updateStatus.mockResolvedValue({ id: 'payment1', orderId: 'order1', amountVnd: 20000, status: 'PAID_MANUAL' });
    ordersRepo.findById.mockResolvedValue({ id: 'order1', customerId: 'cust1' });

    const res = await service.confirmPayment(adminActor, 'payment1', 'good note', 'req1');
    expect(res.status).toBe('PAID_MANUAL');
    expect(auditService.append).toHaveBeenCalled();
  });

  test('confirm triggers exactly one PAYMENT notification for the order customer, post-commit', async () => {
    repo.findByConfirmationRequestId.mockResolvedValue(null);
    repo.findById.mockResolvedValue({ id: 'payment1', orderId: 'order1', amountVnd: 20000, status: 'UNPAID' });
    repo.updateStatus.mockResolvedValue({ id: 'payment1', orderId: 'order1', amountVnd: 20000, status: 'PAID_MANUAL' });
    ordersRepo.findById.mockResolvedValue({ id: 'order1', customerId: 'cust1' });

    await service.confirmPayment(adminActor, 'payment1', 'good note', 'req1');

    expect(notificationTriggers.notifyPaymentConfirmed).toHaveBeenCalledTimes(1);
    expect(notificationTriggers.notifyPaymentConfirmed).toHaveBeenCalledWith({
      customerId: 'cust1',
      orderId: 'order1',
      amountVnd: 20000,
    });
  });

  test('confirm does not notify when the order can no longer be found', async () => {
    repo.findByConfirmationRequestId.mockResolvedValue(null);
    repo.findById.mockResolvedValue({ id: 'payment1', orderId: 'order1', amountVnd: 20000, status: 'UNPAID' });
    repo.updateStatus.mockResolvedValue({ id: 'payment1', orderId: 'order1', amountVnd: 20000, status: 'PAID_MANUAL' });
    ordersRepo.findById.mockResolvedValue(null);

    const res = await service.confirmPayment(adminActor, 'payment1', 'good note', 'req1');

    expect(res.status).toBe('PAID_MANUAL');
    expect(notificationTriggers.notifyPaymentConfirmed).not.toHaveBeenCalled();
  });

  test('a notification-trigger failure never fails an already-committed confirmation', async () => {
    repo.findByConfirmationRequestId.mockResolvedValue(null);
    repo.findById.mockResolvedValue({ id: 'payment1', orderId: 'order1', amountVnd: 20000, status: 'UNPAID' });
    repo.updateStatus.mockResolvedValue({ id: 'payment1', orderId: 'order1', amountVnd: 20000, status: 'PAID_MANUAL' });
    ordersRepo.findById.mockRejectedValue(new Error('db hiccup'));

    const res = await service.confirmPayment(adminActor, 'payment1', 'good note', 'req1');

    expect(res.status).toBe('PAID_MANUAL');
  });

  test('confirm idempotency', async () => {
    repo.findByConfirmationRequestId.mockResolvedValue({ id: 'payment1', status: 'PAID_MANUAL' });
    const res = await service.confirmPayment(adminActor, 'payment1', 'good note', 'req1');
    expect(res.status).toBe('PAID_MANUAL');
    expect(notificationTriggers.notifyPaymentConfirmed).not.toHaveBeenCalled();
  });

  test('a replayed confirmation (already PAID_MANUAL) does not trigger a second notification', async () => {
    repo.findByConfirmationRequestId.mockResolvedValue(null);
    repo.findById.mockResolvedValue({ id: 'payment1', orderId: 'order1', amountVnd: 20000, status: 'PAID_MANUAL' });

    const res = await service.confirmPayment(adminActor, 'payment1', 'good note', 'req1');

    expect(res.status).toBe('PAID_MANUAL');
    expect(notificationTriggers.notifyPaymentConfirmed).not.toHaveBeenCalled();
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

  describe('invoice issuance dispatch', () => {
    test('an immediate confirmation triggers issuance exactly once, post-commit', async () => {
      repo.findByConfirmationRequestId.mockResolvedValue(null);
      repo.findById.mockResolvedValue({ id: 'payment1', orderId: 'order1', amountVnd: 20000, status: 'UNPAID' });
      repo.updateStatus.mockResolvedValue({ id: 'payment1', orderId: 'order1', amountVnd: 20000, status: 'PAID_MANUAL' });
      ordersRepo.findById.mockResolvedValue({ id: 'order1', customerId: 'cust1' });

      await service.confirmPayment(adminActor, 'payment1', 'good note', 'req1');

      expect(invoiceIssuancePort.ensureInvoiceForPayment).toHaveBeenCalledTimes(1);
      expect(invoiceIssuancePort.ensureInvoiceForPayment).toHaveBeenCalledWith('order1', 'payment1');
    });

    test('a confirmation replayed via confirmationRequestId also retries issuance', async () => {
      repo.findByConfirmationRequestId.mockResolvedValue({ id: 'payment1', orderId: 'order1', status: 'PAID_MANUAL' });

      await service.confirmPayment(adminActor, 'payment1', 'good note', 'req1');

      expect(invoiceIssuancePort.ensureInvoiceForPayment).toHaveBeenCalledTimes(1);
      expect(invoiceIssuancePort.ensureInvoiceForPayment).toHaveBeenCalledWith('order1', 'payment1');
    });

    test('a replay of an already-PAID_MANUAL intent also retries issuance', async () => {
      repo.findByConfirmationRequestId.mockResolvedValue(null);
      repo.findById.mockResolvedValue({ id: 'payment1', orderId: 'order1', amountVnd: 20000, status: 'PAID_MANUAL' });

      await service.confirmPayment(adminActor, 'payment1', 'good note', 'req1');

      expect(invoiceIssuancePort.ensureInvoiceForPayment).toHaveBeenCalledTimes(1);
      expect(invoiceIssuancePort.ensureInvoiceForPayment).toHaveBeenCalledWith('order1', 'payment1');
    });

    test('needsEmailPrompt=true triggers the missing-email notification for the order customer', async () => {
      repo.findByConfirmationRequestId.mockResolvedValue(null);
      repo.findById.mockResolvedValue({ id: 'payment1', orderId: 'order1', amountVnd: 20000, status: 'UNPAID' });
      repo.updateStatus.mockResolvedValue({ id: 'payment1', orderId: 'order1', amountVnd: 20000, status: 'PAID_MANUAL' });
      ordersRepo.findById.mockResolvedValue({ id: 'order1', customerId: 'cust1' });
      invoiceIssuancePort.ensureInvoiceForPayment.mockResolvedValue({ invoiceId: 'inv1', needsEmailPrompt: true });

      await service.confirmPayment(adminActor, 'payment1', 'good note', 'req1');

      expect(notificationTriggers.notifyInvoiceEmailMissing).toHaveBeenCalledWith({
        customerId: 'cust1',
        orderId: 'order1',
      });
    });

    test('needsEmailPrompt=false never triggers the missing-email notification', async () => {
      repo.findByConfirmationRequestId.mockResolvedValue(null);
      repo.findById.mockResolvedValue({ id: 'payment1', orderId: 'order1', amountVnd: 20000, status: 'UNPAID' });
      repo.updateStatus.mockResolvedValue({ id: 'payment1', orderId: 'order1', amountVnd: 20000, status: 'PAID_MANUAL' });
      ordersRepo.findById.mockResolvedValue({ id: 'order1', customerId: 'cust1' });
      invoiceIssuancePort.ensureInvoiceForPayment.mockResolvedValue({ invoiceId: 'inv1', needsEmailPrompt: false });

      await service.confirmPayment(adminActor, 'payment1', 'good note', 'req1');

      expect(notificationTriggers.notifyInvoiceEmailMissing).not.toHaveBeenCalled();
    });

    test('a rejecting invoice issuance port never fails an already-committed confirmation', async () => {
      repo.findByConfirmationRequestId.mockResolvedValue(null);
      repo.findById.mockResolvedValue({ id: 'payment1', orderId: 'order1', amountVnd: 20000, status: 'UNPAID' });
      repo.updateStatus.mockResolvedValue({ id: 'payment1', orderId: 'order1', amountVnd: 20000, status: 'PAID_MANUAL' });
      ordersRepo.findById.mockResolvedValue({ id: 'order1', customerId: 'cust1' });
      invoiceIssuancePort.ensureInvoiceForPayment.mockRejectedValue(new Error('invoice service down'));

      const res = await service.confirmPayment(adminActor, 'payment1', 'good note', 'req1');

      expect(res.status).toBe('PAID_MANUAL');
      expect(notificationTriggers.notifyInvoiceEmailMissing).not.toHaveBeenCalled();
    });
  });

  describe('confirmCashPaymentByDriver', () => {
    test('rejects non-driver actor', async () => {
      await expect(service.confirmCashPaymentByDriver(customerActor, 'order1', 'req1')).rejects.toThrow(DomainError);
    });

    test('rejects when order not found', async () => {
      ordersRepo.findById.mockResolvedValue(null);
      await expect(service.confirmCashPaymentByDriver(driverActor, 'order1', 'req1')).rejects.toThrow(DomainError);
    });

    test('rejects when driver is not assigned to order', async () => {
      ordersRepo.findById.mockResolvedValue({ id: 'order1', driverId: 'other-drv', priceVnd: 50000 });
      await expect(service.confirmCashPaymentByDriver(driverActor, 'order1', 'req1')).rejects.toThrow(DomainError);
    });

    test('rejects when order status is CANCELLED', async () => {
      ordersRepo.findById.mockResolvedValue({ id: 'order1', driverId: 'drv1', status: 'CANCELLED', priceVnd: 50000 });
      await expect(service.confirmCashPaymentByDriver(driverActor, 'order1', 'req1')).rejects.toThrow(DomainError);
    });

    test('returns existing intent if confirmationRequestId already processed', async () => {
      repo.findByConfirmationRequestId.mockResolvedValue({ id: 'intent1', status: 'PAID_MANUAL', orderId: 'order1' });
      ordersRepo.findById.mockResolvedValue({ id: 'order1', driverId: 'drv1', priceVnd: 50000 });

      const res = await service.confirmCashPaymentByDriver(driverActor, 'order1', 'req1');
      expect(res.id).toBe('intent1');
      expect(invoiceIssuancePort.ensureInvoiceForPayment).toHaveBeenCalledWith('order1', 'intent1');
    });

    test('creates new intent if no active intent exists and sets PAID_MANUAL', async () => {
      repo.findByConfirmationRequestId.mockResolvedValue(null);
      ordersRepo.findById.mockResolvedValue({ id: 'order1', driverId: 'drv1', customerId: 'cust1', priceVnd: 50000 });
      repo.findActiveIntent.mockResolvedValue(null);
      repo.create.mockResolvedValue({ id: 'intent-new', status: 'UNPAID', amountVnd: 50000 });
      repo.updateStatus.mockResolvedValue({
        id: 'intent-new',
        orderId: 'order1',
        amountVnd: 50000,
        status: 'PAID_MANUAL',
      });

      const res = await service.confirmCashPaymentByDriver(driverActor, 'order1', 'req1');
      expect(res.status).toBe('PAID_MANUAL');
      expect(repo.create).toHaveBeenCalledWith(
        {
          orderId: 'order1',
          amountVnd: 50000,
          status: 'UNPAID',
          provider: 'LOCAL',
          clientRequestId: 'req1',
        },
        prisma,
      );
      expect(repo.updateStatus).toHaveBeenCalledWith(
        'intent-new',
        expect.objectContaining({
          status: 'PAID_MANUAL',
          confirmedById: 'drv1',
          confirmationRequestId: 'req1',
        }),
        prisma,
      );
      expect(notificationTriggers.notifyPaymentConfirmed).toHaveBeenCalledWith({
        customerId: 'cust1',
        orderId: 'order1',
        amountVnd: 50000,
      });
      expect(invoiceIssuancePort.ensureInvoiceForPayment).toHaveBeenCalledWith('order1', 'intent-new');
    });

    test('reuses existing active intent if present', async () => {
      repo.findByConfirmationRequestId.mockResolvedValue(null);
      ordersRepo.findById.mockResolvedValue({ id: 'order1', driverId: 'drv1', customerId: 'cust1', priceVnd: 60000 });
      repo.findActiveIntent.mockResolvedValue({ id: 'intent-active', status: 'QR_CREATED', amountVnd: 60000 });
      repo.updateStatus.mockResolvedValue({
        id: 'intent-active',
        orderId: 'order1',
        amountVnd: 60000,
        status: 'PAID_MANUAL',
      });

      const res = await service.confirmCashPaymentByDriver(driverActor, 'order1', 'req1');
      expect(res.status).toBe('PAID_MANUAL');
      expect(repo.create).not.toHaveBeenCalled();
      expect(repo.updateStatus).toHaveBeenCalledWith(
        'intent-active',
        expect.objectContaining({
          status: 'PAID_MANUAL',
          confirmedById: 'drv1',
          confirmationRequestId: 'req1',
        }),
        prisma,
      );
      expect(notificationTriggers.notifyPaymentConfirmed).toHaveBeenCalled();
      expect(invoiceIssuancePort.ensureInvoiceForPayment).toHaveBeenCalled();
    });
  });
});
