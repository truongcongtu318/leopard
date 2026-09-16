import { Prisma, type Invoice, type InvoiceSequence } from '@prisma/client';

// Extracted from prisma-mock.ts (VAT invoice plan) to keep that file under
// the project's 800-line limit and to avoid touching its existing,
// unrelated in-progress hunks. Mirrors the same in-memory-Map-backed
// per-model mock pattern as prisma-mock-notifications.ts.

function matchesInvoiceWhere(inv: Invoice, where?: any): boolean {
  if (!where) return true;

  if (where.AND && Array.isArray(where.AND)) {
    return where.AND.every((cond: any) => matchesInvoiceWhere(inv, cond));
  }

  if (where.OR && Array.isArray(where.OR)) {
    return where.OR.some((cond: any) => matchesInvoiceWhere(inv, cond));
  }

  if (where.status && inv.status !== where.status) {
    return false;
  }

  if (where.issuedAt) {
    if (where.issuedAt.gte && inv.issuedAt < where.issuedAt.gte) return false;
    if (where.issuedAt.lte && inv.issuedAt > where.issuedAt.lte) return false;
  }

  if (where.createdAt) {
    if (where.createdAt.gte && inv.createdAt < where.createdAt.gte) return false;
    if (where.createdAt.lte && inv.createdAt > where.createdAt.lte) return false;
  }

  if ('customerEmail' in where) {
    if (where.customerEmail === null) {
      if (inv.customerEmail !== null) return false;
    } else if (where.customerEmail === '') {
      if (inv.customerEmail !== '') return false;
    } else if (typeof where.customerEmail === 'object' && where.customerEmail?.contains) {
      const needle = where.customerEmail.contains.toLowerCase();
      if (!inv.customerEmail?.toLowerCase().includes(needle)) return false;
    } else if (typeof where.customerEmail === 'string') {
      if (inv.customerEmail !== where.customerEmail) return false;
    }
  }

  if (where.invoiceNumber) {
    if (typeof where.invoiceNumber === 'object' && where.invoiceNumber?.contains) {
      const needle = where.invoiceNumber.contains.toLowerCase();
      if (!inv.invoiceNumber.toLowerCase().includes(needle)) return false;
    } else if (inv.invoiceNumber !== where.invoiceNumber) {
      return false;
    }
  }

  if (where.customerName) {
    if (typeof where.customerName === 'object' && where.customerName?.contains) {
      const needle = where.customerName.contains.toLowerCase();
      if (!inv.customerName.toLowerCase().includes(needle)) return false;
    } else if (inv.customerName !== where.customerName) {
      return false;
    }
  }

  return true;
}

export function createInvoiceMock(invoices: Map<string, Invoice>, orders?: Map<string, any>) {
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
      const now = data.issuedAt ?? data.createdAt ?? new Date();
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
        pdfStorageKey: data.pdfStorageKey ?? `pdf-${id}`,
        status: data.status ?? 'ISSUED',
        emailSentAt: data.emailSentAt ?? null,
        issuedAt: data.issuedAt ?? now,
        createdAt: data.createdAt ?? now,
        updatedAt: data.updatedAt ?? now,
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
    count: jest.fn(async ({ where }: { where?: any } = {}) => {
      const list = Array.from(invoices.values()).filter((inv) => matchesInvoiceWhere(inv, where));
      return list.length;
    }),
    findMany: jest.fn(
      async ({
        where,
        skip = 0,
        take,
        include,
        orderBy,
      }: { where?: any; skip?: number; take?: number; include?: any; orderBy?: any } = {}) => {
        let list = Array.from(invoices.values()).filter((inv) => matchesInvoiceWhere(inv, where));

        if (orderBy?.issuedAt === 'desc') {
          list.sort((a, b) => b.issuedAt.getTime() - a.issuedAt.getTime());
        } else if (orderBy?.createdAt === 'desc') {
          list.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        }

        if (skip) list = list.slice(skip);
        if (take !== undefined) list = list.slice(0, take);

        return list.map((inv) => {
          const item: any = { ...inv };
          if (include?.order) {
            const order = orders?.get(inv.orderId);
            item.order = order ? { ...order } : { id: inv.orderId };
          }
          return item;
        });
      },
    ),
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
