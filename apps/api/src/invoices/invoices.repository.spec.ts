import { beforeEach, describe, expect, it, jest } from '@jest/globals';

import { InvoicesRepository } from './invoices.repository.js';

describe('InvoicesRepository.reserveNextInvoiceNumber', () => {
  let repo: InvoicesRepository;

  beforeEach(() => {
    repo = new InvoicesRepository({} as never);
  });

  it('formats the first number of a year as 6-digit zero-padded', async () => {
    const tx = {
      invoiceSequence: {
        upsert: jest.fn(async () => ({ year: 2026, lastValue: 1 })),
      },
    };

    const invoiceNumber = await repo.reserveNextInvoiceNumber(2026, tx as never);

    expect(invoiceNumber).toBe('LP/2026/000001');
    expect(tx.invoiceSequence.upsert).toHaveBeenCalledWith({
      where: { year: 2026 },
      create: { year: 2026, lastValue: 1 },
      update: { lastValue: { increment: 1 } },
    });
  });

  it('formats successive reservations with the incremented value', async () => {
    const tx = {
      invoiceSequence: {
        upsert: jest.fn(async () => ({ year: 2026, lastValue: 2 })),
      },
    };

    const invoiceNumber = await repo.reserveNextInvoiceNumber(2026, tx as never);

    expect(invoiceNumber).toBe('LP/2026/000002');
  });

  it('does not truncate past 6 digits once lastValue exceeds 999,999', async () => {
    const tx = {
      invoiceSequence: {
        upsert: jest.fn(async () => ({ year: 2026, lastValue: 1_000_000 })),
      },
    };

    const invoiceNumber = await repo.reserveNextInvoiceNumber(2026, tx as never);

    expect(invoiceNumber).toBe('LP/2026/1000000');
  });

  it('never derives the number from anything but the upserted lastValue (no max()/count() call)', async () => {
    const tx = {
      invoiceSequence: {
        upsert: jest.fn(async () => ({ year: 2026, lastValue: 1 })),
      },
      invoice: {
        aggregate: jest.fn(),
        count: jest.fn(),
      },
    };

    await repo.reserveNextInvoiceNumber(2026, tx as never);

    expect(tx.invoice.aggregate).not.toHaveBeenCalled();
    expect(tx.invoice.count).not.toHaveBeenCalled();
  });
});
