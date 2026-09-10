import { Prisma, type Invoice, type InvoiceSequence } from '@prisma/client';

// Extracted from prisma-mock.ts (VAT invoice plan) to keep that file under
// the project's 800-line limit and to avoid touching its existing,
// unrelated in-progress hunks. Mirrors the same in-memory-Map-backed
// per-model mock pattern as prisma-mock-notifications.ts.

export function createInvoiceMock(invoices: Map<string, Invoice>) {
  return {
    findUnique: jest.fn(
      async ({ where }: { where: { id?: string; orderId?: string; paymentIntentId?: string } }) => {
        if (where.id) return invoices.get(where.id) ?? null;
        if (where.orderId) {
          return Array.from(invoices.values()).find((i) => i.orderId === where.orderId) ?? null;
        }
        if (where.paymentIntentId) {
          return (
            Array.from(invoices.values()).find((i) => i.paymentIntentId === where.paymentIntentId) ?? null
          );
        }
        return null;
      },
    ),
    create: jest.fn(async ({ data }: { data: any }) => {
      const existingByOrder = Array.from(invoices.values()).find((i) => i.orderId === data.orderId);
      const existingByPayment = Array.from(invoices.values()).find(
        (i) => i.paymentIntentId === data.paymentIntentId,
      );
      const existingByNumber = Array.from(invoices.values()).find(
        (i) => i.invoiceNumber === data.invoiceNumber,
      );
      if (existingByOrder || existingByPayment || existingByNumber) {
        // A real `Prisma.PrismaClientKnownRequestError` (not a stand-in) so
        // `InvoicesService`'s `error instanceof Prisma.PrismaClientKnownRequestError`
        // check behaves exactly as it would against a real database.
        throw new Prisma.PrismaClientKnownRequestError('Unique constraint failed on the fields', {
          code: 'P2002',
          clientVersion: 'mock',
        });
      }

      const id = data.id ?? `invoice-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      const now = new Date();
      const invoice: Invoice = {
        id,
        orderId: data.orderId,
        paymentIntentId: data.paymentIntentId,
        invoiceNumber: data.invoiceNumber,
        customerName: data.customerName,
        customerEmail: data.customerEmail ?? null,
        customerTaxCode: data.customerTaxCode ?? null,
        customerAddress: data.customerAddress ?? null,
        amountVnd: data.amountVnd,
        vatRateVnd: data.vatRateVnd,
        totalVnd: data.totalVnd,
        pdfStorageKey: data.pdfStorageKey,
        status: data.status ?? 'ISSUED',
        emailSentAt: data.emailSentAt ?? null,
        issuedAt: now,
        createdAt: now,
        updatedAt: now,
      };
      invoices.set(id, invoice);
      return invoice;
    }),
    update: jest.fn(async ({ where, data }: { where: { id: string }; data: Partial<Invoice> }) => {
      const existing = invoices.get(where.id);
      if (!existing) throw new Error('Invoice not found');
      const updated = { ...existing, ...data, updatedAt: new Date() };
      invoices.set(where.id, updated);
      return updated;
    }),
  };
}

export function createInvoiceSequenceMock(sequences: Map<number, InvoiceSequence>) {
  return {
    upsert: jest.fn(
      async ({
        where,
      }: {
        where: { year: number };
        create: { year: number; lastValue: number };
        update: { lastValue: { increment: number } };
      }) => {
        const existing = sequences.get(where.year);
        const lastValue = (existing?.lastValue ?? 0) + 1;
        const updated: InvoiceSequence = { year: where.year, lastValue, updatedAt: new Date() };
        sequences.set(where.year, updated);
        return updated;
      },
    ),
  };
}
