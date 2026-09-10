import { Prisma } from '@prisma/client';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';

import { InvoicesService } from './invoices.service.js';

const CUSTOMER_ACTOR = { userId: 'customer-1', role: 'CUSTOMER' as const, sessionId: 's1' };
const OTHER_CUSTOMER_ACTOR = { userId: 'customer-2', role: 'CUSTOMER' as const, sessionId: 's2' };
const ADMIN_ACTOR = { userId: 'admin-1', role: 'ADMIN' as const, sessionId: 's3' };

const ORDER = { id: 'order-1', customerId: 'customer-1' };
const PAYMENT_INTENT = { id: 'payment-1', orderId: 'order-1', status: 'PAID_MANUAL', amountVnd: 480_000 };
const CUSTOMER_USER = { id: 'customer-1', name: 'Nguyễn Văn A', email: 'a@example.com' };

const EXISTING_INVOICE = {
  id: 'invoice-1',
  orderId: 'order-1',
  paymentIntentId: 'payment-1',
  invoiceNumber: 'LP/2026/000001',
  customerName: 'Nguyễn Văn A',
  customerEmail: 'a@example.com',
  customerTaxCode: null,
  customerAddress: null,
  amountVnd: 480_000,
  vatRateVnd: 48_000,
  totalVnd: 528_000,
  pdfStorageKey: 'invoices/existing.pdf',
  status: 'ISSUED',
  emailSentAt: null,
  issuedAt: new Date('2026-09-08T00:00:00.000Z'),
  createdAt: new Date('2026-09-08T00:00:00.000Z'),
  updatedAt: new Date('2026-09-08T00:00:00.000Z'),
};

function createMocks() {
  const invoicesRepo = {
    findByOrderId: jest.fn(async () => null as unknown),
    findByPaymentIntentId: jest.fn(async () => null as unknown),
    findById: jest.fn(async () => null as unknown),
    create: jest.fn(async (data: unknown) => ({ ...EXISTING_INVOICE, ...(data as object) })),
    setEmailSent: jest.fn(async (id: string, emailSentAt: Date, customerEmail?: string) => ({
      ...EXISTING_INVOICE,
      id,
      emailSentAt,
      ...(customerEmail !== undefined ? { customerEmail } : {}),
    })),
    reserveNextInvoiceNumber: jest.fn(async () => 'LP/2026/000002'),
    runTransaction: jest.fn(async (fn: (tx: unknown) => Promise<unknown>) => fn({})),
  };
  const prisma = {
    paymentIntent: {
      findUnique: jest.fn(async () => PAYMENT_INTENT as unknown),
      findFirst: jest.fn(async () => null as unknown),
    },
    user: {
      findUnique: jest.fn(async () => CUSTOMER_USER as unknown),
      update: jest.fn(async () => undefined),
    },
  };
  const storage = {
    put: jest.fn(async () => undefined),
    delete: jest.fn(async () => undefined),
    createReadUrl: jest.fn(async (key: string) => `https://signed.example/${key}`),
  };
  const invoiceProvider = {
    generate: jest.fn(async () => ({
      vatRateVnd: 48_000,
      totalVnd: 528_000,
      pdfBuffer: Buffer.from('%PDF-fake'),
    })),
  };
  const mailProvider = {
    sendInvoiceLink: jest.fn(async () => undefined),
  };
  const ordersRepo = {
    findById: jest.fn(async () => ORDER as unknown),
  };

  return { invoicesRepo, prisma, storage, invoiceProvider, mailProvider, ordersRepo };
}

function createService(mocks: ReturnType<typeof createMocks>): InvoicesService {
  return new InvoicesService(
    mocks.invoicesRepo as never,
    mocks.prisma as never,
    mocks.storage as never,
    mocks.invoiceProvider as never,
    mocks.mailProvider as never,
    mocks.ordersRepo as never,
  );
}

describe('InvoicesService.ensureInvoice', () => {
  let mocks: ReturnType<typeof createMocks>;
  let service: InvoicesService;

  beforeEach(() => {
    mocks = createMocks();
    service = createService(mocks);
  });

  it('returns the existing invoice immediately without touching the provider/storage/repo.create', async () => {
    mocks.invoicesRepo.findByOrderId.mockResolvedValueOnce(EXISTING_INVOICE as never);

    const result = await service.ensureInvoice('order-1', 'payment-1');

    expect(result).toBe(EXISTING_INVOICE);
    expect(mocks.invoiceProvider.generate).not.toHaveBeenCalled();
    expect(mocks.storage.put).not.toHaveBeenCalled();
    expect(mocks.invoicesRepo.create).not.toHaveBeenCalled();
  });

  it('throws RESOURCE_NOT_FOUND when the order is missing', async () => {
    mocks.ordersRepo.findById.mockResolvedValueOnce(null as never);

    await expect(service.ensureInvoice('order-1', 'payment-1')).rejects.toMatchObject({
      code: 'RESOURCE_NOT_FOUND',
      status: 404,
    });
  });

  it('throws RESOURCE_NOT_FOUND when the payment intent is missing', async () => {
    mocks.prisma.paymentIntent.findUnique.mockResolvedValueOnce(null as never);

    await expect(service.ensureInvoice('order-1', 'payment-1')).rejects.toMatchObject({
      code: 'RESOURCE_NOT_FOUND',
    });
  });

  it('throws RESOURCE_NOT_FOUND when the payment intent belongs to a different order', async () => {
    mocks.prisma.paymentIntent.findUnique.mockResolvedValueOnce({
      ...PAYMENT_INTENT,
      orderId: 'order-mismatch',
    } as never);

    await expect(service.ensureInvoice('order-1', 'payment-1')).rejects.toMatchObject({
      code: 'RESOURCE_NOT_FOUND',
    });
  });

  it('throws VALIDATION_ERROR when the payment intent is not PAID_MANUAL', async () => {
    mocks.prisma.paymentIntent.findUnique.mockResolvedValueOnce({
      ...PAYMENT_INTENT,
      status: 'QR_CREATED',
    } as never);

    await expect(service.ensureInvoice('order-1', 'payment-1')).rejects.toMatchObject({
      code: 'VALIDATION_ERROR',
      status: 422,
    });
    expect(mocks.storage.put).not.toHaveBeenCalled();
    expect(mocks.invoicesRepo.create).not.toHaveBeenCalled();
  });

  it('reserves a number, uses PaymentIntent.amountVnd (not Order.priceVnd), uploads, persists, and emails', async () => {
    mocks.prisma.paymentIntent.findUnique.mockResolvedValueOnce({
      ...PAYMENT_INTENT,
      amountVnd: 480_000,
    } as never);
    mocks.ordersRepo.findById.mockResolvedValueOnce({
      ...ORDER,
      priceVnd: 999_999_999, // deliberately different — must never reach the provider
    } as never);

    const result = await service.ensureInvoice('order-1', 'payment-1');

    expect(mocks.invoiceProvider.generate).toHaveBeenCalledWith(
      expect.objectContaining({ amountVnd: 480_000 }),
    );
    expect(mocks.storage.put).toHaveBeenCalledWith(
      expect.stringMatching(/^invoices\/.+\.pdf$/),
      expect.any(Buffer),
      'application/pdf',
    );
    expect(mocks.invoicesRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        orderId: 'order-1',
        paymentIntentId: 'payment-1',
        amountVnd: 480_000,
        vatRateVnd: 48_000,
        totalVnd: 528_000,
      }),
    );
    expect(mocks.mailProvider.sendInvoiceLink).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'a@example.com' }),
    );
    expect(mocks.invoicesRepo.setEmailSent).toHaveBeenCalled();
    expect(result).toBeTruthy();
  });

  it('leaves emailSentAt null and never calls the mail provider when the customer has no email', async () => {
    mocks.prisma.user.findUnique.mockResolvedValueOnce({ ...CUSTOMER_USER, email: null } as never);

    const result = await service.ensureInvoice('order-1', 'payment-1');

    expect(mocks.mailProvider.sendInvoiceLink).not.toHaveBeenCalled();
    expect(mocks.invoicesRepo.setEmailSent).not.toHaveBeenCalled();
    expect(result.emailSentAt).toBeNull();
  });

  it('still resolves with the issued invoice when the auto-email send fails', async () => {
    mocks.mailProvider.sendInvoiceLink.mockRejectedValueOnce(new Error('smtp down'));

    const result = await service.ensureInvoice('order-1', 'payment-1');

    expect(result).toBeTruthy();
    expect(mocks.invoicesRepo.setEmailSent).not.toHaveBeenCalled();
  });

  it('deletes its own upload and returns the winning row when it loses a unique-constraint race', async () => {
    const winningRow = { ...EXISTING_INVOICE, pdfStorageKey: 'invoices/winner.pdf' };
    const conflict = new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
      code: 'P2002',
      clientVersion: '7.8.0',
    });
    mocks.invoicesRepo.create.mockRejectedValueOnce(conflict);
    mocks.invoicesRepo.findByOrderId.mockResolvedValueOnce(null as never); // fast-path check
    mocks.invoicesRepo.findByOrderId.mockResolvedValueOnce(winningRow as never); // re-check after conflict

    const result = await service.ensureInvoice('order-1', 'payment-1');

    expect(result).toBe(winningRow);
    expect(mocks.storage.delete).toHaveBeenCalledWith(expect.stringMatching(/^invoices\/.+\.pdf$/));
  });

  it('rethrows and still cleans up the upload for a non-unique-constraint persistence failure', async () => {
    const dbError = new Error('connection lost');
    mocks.invoicesRepo.create.mockRejectedValueOnce(dbError);

    await expect(service.ensureInvoice('order-1', 'payment-1')).rejects.toBe(dbError);
    expect(mocks.storage.delete).toHaveBeenCalledWith(expect.stringMatching(/^invoices\/.+\.pdf$/));
  });
});

describe('InvoicesService.ensureInvoiceForPayment', () => {
  let mocks: ReturnType<typeof createMocks>;
  let service: InvoicesService;

  beforeEach(() => {
    mocks = createMocks();
    service = createService(mocks);
  });

  it('never throws — resolves null when ensureInvoice fails', async () => {
    mocks.ordersRepo.findById.mockResolvedValueOnce(null as never);

    await expect(service.ensureInvoiceForPayment('order-1', 'payment-1')).resolves.toBeNull();
  });

  it('reports needsEmailPrompt=true when the issued invoice has no email sent', async () => {
    mocks.prisma.user.findUnique.mockResolvedValueOnce({ ...CUSTOMER_USER, email: null } as never);

    const result = await service.ensureInvoiceForPayment('order-1', 'payment-1');

    expect(result).toMatchObject({ needsEmailPrompt: true });
  });

  it('reports needsEmailPrompt=false when the email was already sent', async () => {
    const result = await service.ensureInvoiceForPayment('order-1', 'payment-1');

    expect(result).toMatchObject({ needsEmailPrompt: false });
  });
});

describe('InvoicesService.getForOrder', () => {
  let mocks: ReturnType<typeof createMocks>;
  let service: InvoicesService;

  beforeEach(() => {
    mocks = createMocks();
    service = createService(mocks);
  });

  it('404s a caller who is neither the order owner nor admin, without disclosing more', async () => {
    await expect(service.getForOrder(OTHER_CUSTOMER_ACTOR, 'order-1')).rejects.toMatchObject({
      code: 'RESOURCE_NOT_FOUND',
      status: 404,
    });
  });

  it('returns the existing invoice view without retrying issuance', async () => {
    mocks.invoicesRepo.findByOrderId.mockResolvedValueOnce(EXISTING_INVOICE as never);

    const view = await service.getForOrder(CUSTOMER_ACTOR, 'order-1');

    expect(view.invoiceNumber).toBe(EXISTING_INVOICE.invoiceNumber);
    expect(mocks.prisma.paymentIntent.findFirst).not.toHaveBeenCalled();
  });

  it('retries issuance on read when no invoice exists but a PAID_MANUAL payment does', async () => {
    mocks.prisma.paymentIntent.findFirst.mockResolvedValueOnce(PAYMENT_INTENT as never);
    // ensureInvoiceForPayment's created row is looked back up by id before
    // getForOrder can build a view from it.
    mocks.invoicesRepo.findById.mockResolvedValueOnce(EXISTING_INVOICE as never);

    const view = await service.getForOrder(CUSTOMER_ACTOR, 'order-1');

    expect(view).toBeTruthy();
    expect(mocks.invoicesRepo.create).toHaveBeenCalled();
  });

  it('404s when there is no invoice and no PAID_MANUAL payment to retry from', async () => {
    await expect(service.getForOrder(CUSTOMER_ACTOR, 'order-1')).rejects.toMatchObject({
      code: 'RESOURCE_NOT_FOUND',
    });
  });

  it('allows an admin to read any customer order invoice', async () => {
    mocks.invoicesRepo.findByOrderId.mockResolvedValueOnce(EXISTING_INVOICE as never);

    await expect(service.getForOrder(ADMIN_ACTOR, 'order-1')).resolves.toBeTruthy();
  });
});

describe('InvoicesService.sendEmail', () => {
  let mocks: ReturnType<typeof createMocks>;
  let service: InvoicesService;

  beforeEach(() => {
    mocks = createMocks();
    service = createService(mocks);
    mocks.invoicesRepo.findById.mockResolvedValue(EXISTING_INVOICE as never);
  });

  it('sends via the mail provider then marks emailSentAt', async () => {
    const view = await service.sendEmail(CUSTOMER_ACTOR, 'invoice-1', 'new@example.com');

    expect(mocks.mailProvider.sendInvoiceLink).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'new@example.com' }),
    );
    expect(mocks.invoicesRepo.setEmailSent).toHaveBeenCalledWith(
      'invoice-1',
      expect.any(Date),
      'new@example.com',
    );
    expect(view).toBeTruthy();
  });

  it('throws MAIL_PROVIDER_FAILED and never marks emailSentAt when the send fails', async () => {
    mocks.mailProvider.sendInvoiceLink.mockRejectedValueOnce(new Error('smtp down'));

    await expect(service.sendEmail(CUSTOMER_ACTOR, 'invoice-1', 'new@example.com')).rejects.toMatchObject({
      code: 'MAIL_PROVIDER_FAILED',
      status: 502,
    });
    expect(mocks.invoicesRepo.setEmailSent).not.toHaveBeenCalled();
  });

  it('backfills a null User.email but never overwrites an existing one', async () => {
    mocks.prisma.user.findUnique.mockResolvedValueOnce({ ...CUSTOMER_USER, email: null } as never);

    await service.sendEmail(CUSTOMER_ACTOR, 'invoice-1', 'new@example.com');

    expect(mocks.prisma.user.update).toHaveBeenCalledWith({
      where: { id: CUSTOMER_USER.id },
      data: { email: 'new@example.com' },
    });
  });

  it('does not touch User.email when the user already has one', async () => {
    await service.sendEmail(CUSTOMER_ACTOR, 'invoice-1', 'new@example.com');

    expect(mocks.prisma.user.update).not.toHaveBeenCalled();
  });

  it('swallows a backfill failure (e.g. unique-email collision) and still returns success', async () => {
    mocks.prisma.user.findUnique.mockResolvedValueOnce({ ...CUSTOMER_USER, email: null } as never);
    mocks.prisma.user.update.mockRejectedValueOnce(new Error('unique constraint on email'));

    await expect(service.sendEmail(CUSTOMER_ACTOR, 'invoice-1', 'new@example.com')).resolves.toBeTruthy();
  });

  it('404s a non-owner, non-admin caller the same way as getForOrder', async () => {
    await expect(
      service.sendEmail(OTHER_CUSTOMER_ACTOR, 'invoice-1', 'new@example.com'),
    ).rejects.toMatchObject({ code: 'RESOURCE_NOT_FOUND' });
  });
});

describe('InvoicesService.getDownloadUrl', () => {
  let mocks: ReturnType<typeof createMocks>;
  let service: InvoicesService;

  beforeEach(() => {
    mocks = createMocks();
    service = createService(mocks);
    mocks.invoicesRepo.findById.mockResolvedValue(EXISTING_INVOICE as never);
  });

  it('returns a signed URL for the invoice owner', async () => {
    const url = await service.getDownloadUrl(CUSTOMER_ACTOR, 'invoice-1');

    expect(url).toContain(EXISTING_INVOICE.pdfStorageKey);
  });

  it('404s a caller who does not own the invoice', async () => {
    await expect(service.getDownloadUrl(OTHER_CUSTOMER_ACTOR, 'invoice-1')).rejects.toMatchObject({
      code: 'RESOURCE_NOT_FOUND',
    });
  });
});
