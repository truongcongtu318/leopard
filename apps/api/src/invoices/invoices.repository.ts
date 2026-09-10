import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service.js';
import type { Invoice, Prisma } from '@prisma/client';

type InvoicesPrismaClient = PrismaService | Prisma.TransactionClient;

export interface CreateInvoiceParams {
  readonly orderId: string;
  readonly paymentIntentId: string;
  readonly invoiceNumber: string;
  readonly customerName: string;
  readonly customerEmail: string | null;
  readonly customerTaxCode: string | null;
  readonly customerAddress: string | null;
  readonly amountVnd: number;
  readonly vatRateVnd: number;
  readonly totalVnd: number;
  readonly pdfStorageKey: string;
}

const INVOICE_NUMBER_PAD_WIDTH = 6;

@Injectable()
export class InvoicesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByOrderId(orderId: string, tx?: InvoicesPrismaClient): Promise<Invoice | null> {
    const client = tx ?? this.prisma;
    return client.invoice.findUnique({ where: { orderId } });
  }

  async findByPaymentIntentId(paymentIntentId: string, tx?: InvoicesPrismaClient): Promise<Invoice | null> {
    const client = tx ?? this.prisma;
    return client.invoice.findUnique({ where: { paymentIntentId } });
  }

  async findById(id: string, tx?: InvoicesPrismaClient): Promise<Invoice | null> {
    const client = tx ?? this.prisma;
    return client.invoice.findUnique({ where: { id } });
  }

  async create(data: CreateInvoiceParams, tx?: InvoicesPrismaClient): Promise<Invoice> {
    const client = tx ?? this.prisma;
    return client.invoice.create({ data });
  }

  async setEmailSent(id: string, emailSentAt: Date, customerEmail?: string): Promise<Invoice> {
    return this.prisma.invoice.update({
      where: { id },
      data: {
        emailSentAt,
        ...(customerEmail !== undefined ? { customerEmail } : {}),
      },
    });
  }

  /**
   * Atomically reserves the next invoice number for the given year via a
   * single UPSERT statement (`InvoiceSequence.lastValue` increment) — atomic
   * regardless of transaction isolation level, so no `max(invoiceNumber)`
   * race is possible under concurrent confirmations. Format: `LP/YYYY/NNNNNN`
   * (6-digit zero-padded, no cap — grows beyond 6 digits gracefully past
   * 999,999 invoices/year rather than throwing).
   */
  async reserveNextInvoiceNumber(year: number, tx: Prisma.TransactionClient): Promise<string> {
    const sequence = await tx.invoiceSequence.upsert({
      where: { year },
      create: { year, lastValue: 1 },
      update: { lastValue: { increment: 1 } },
    });
    return `LP/${year}/${String(sequence.lastValue).padStart(INVOICE_NUMBER_PAD_WIDTH, '0')}`;
  }

  runTransaction<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    return this.prisma.$transaction(fn);
  }
}
