import { Injectable, Logger } from '@nestjs/common';
import { Prisma, type Invoice } from '@prisma/client';
import { randomUUID } from 'node:crypto';

import type { AuthenticatedActor } from '../auth/decorators/current-user.js';
import { DomainError } from '../common/domain-error.js';
import { PrismaService } from '../database/prisma.service.js';
import { StorageProvider } from '../media/storage.provider.js';
import { OrdersRepository } from '../orders/orders.repository.js';
import { InvoiceIssuancePort, type InvoiceIssuanceResult } from './invoice-issuance.port.js';
import { InvoiceProvider } from './invoice.provider.js';
import { InvoicesRepository } from './invoices.repository.js';
import { MailProvider } from './mail.provider.js';

const SIGNED_URL_TTL_SECONDS = 3600;

export interface InvoiceView {
  readonly id: string;
  readonly invoiceNumber: string;
  readonly amountVnd: number;
  readonly vatRateVnd: number;
  readonly totalVnd: number;
  readonly issuedAt: string;
  readonly emailSentAt: string | null;
  readonly viewUrl: string;
}

@Injectable()
export class InvoicesService extends InvoiceIssuancePort {
  private readonly logger = new Logger(InvoicesService.name);

  constructor(
    private readonly invoicesRepo: InvoicesRepository,
    private readonly prisma: PrismaService,
    private readonly storage: StorageProvider,
    private readonly invoiceProvider: InvoiceProvider,
    private readonly mailProvider: MailProvider,
    private readonly ordersRepo: OrdersRepository,
  ) {
    super();
  }

  /**
   * Idempotent: returns the existing invoice for `orderId` before ever
   * allocating a new number or writing a new file. Called both from the
   * payment post-commit hook and (as a retry) from the read endpoints below.
   */
  async ensureInvoice(orderId: string, paymentIntentId: string): Promise<Invoice> {
    const existing = await this.invoicesRepo.findByOrderId(orderId);
    if (existing) {
      return existing;
    }

    const [order, paymentIntent] = await Promise.all([
      this.ordersRepo.findById(orderId),
      this.prisma.paymentIntent.findUnique({ where: { id: paymentIntentId } }),
    ]);

    if (!order || !paymentIntent || paymentIntent.orderId !== orderId) {
      throw new DomainError('RESOURCE_NOT_FOUND', 404, 'Không tìm thấy đơn hàng hoặc thanh toán');
    }
    if (paymentIntent.status !== 'PAID_MANUAL') {
      throw new DomainError('VALIDATION_ERROR', 422, 'Thanh toán chưa được xác nhận');
    }

    const customer = await this.prisma.user.findUnique({ where: { id: order.customerId } });
    const invoiceNumber = await this.reserveInvoiceNumber();

    const generated = await this.invoiceProvider.generate({
      invoiceNumber,
      issuedAt: new Date(),
      orderReference: order.id,
      customerName: customer?.name ?? 'Khách hàng',
      ...(customer?.email ? { customerEmail: customer.email } : {}),
      amountVnd: paymentIntent.amountVnd,
    });

    const pdfStorageKey = `invoices/${randomUUID()}.pdf`;
    await this.storage.put(pdfStorageKey, generated.pdfBuffer, 'application/pdf');

    let invoice: Invoice;
    try {
      invoice = await this.persistInvoiceOrReturnExisting({
        orderId,
        paymentIntentId,
        invoiceNumber,
        customerName: customer?.name ?? 'Khách hàng',
        customerEmail: customer?.email ?? null,
        customerTaxCode: null,
        customerAddress: null,
        amountVnd: paymentIntent.amountVnd,
        vatRateVnd: generated.vatRateVnd,
        totalVnd: generated.totalVnd,
        pdfStorageKey,
      });
    } catch (error) {
      // Best-effort cleanup for ANY persistence failure, not just the
      // race-loss case below — an uploaded PDF must never outlive a DB
      // write that never committed.
      await this.storage.delete(pdfStorageKey).catch(() => {});
      throw error;
    }

    if (invoice.pdfStorageKey !== pdfStorageKey) {
      // Lost the race to a concurrent issuance: our upload is now orphaned.
      await this.storage.delete(pdfStorageKey).catch(() => {});
      return invoice;
    }

    return this.trySendInvoiceEmail(invoice);
  }

  /** Best-effort wrapper used by `PaymentsService` — must never throw. */
  async ensureInvoiceForPayment(
    orderId: string,
    paymentIntentId: string,
  ): Promise<InvoiceIssuanceResult | null> {
    try {
      const invoice = await this.ensureInvoice(orderId, paymentIntentId);
      return { invoiceId: invoice.id, needsEmailPrompt: invoice.emailSentAt === null };
    } catch (error) {
      this.logger.warn(
        `Invoice issuance failed (order=${orderId}, payment=${paymentIntentId}): ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      return null;
    }
  }

  async getForOrder(actor: AuthenticatedActor, orderId: string): Promise<InvoiceView> {
    const order = await this.ordersRepo.findById(orderId);
    if (!order) {
      throw new DomainError('RESOURCE_NOT_FOUND', 404, 'Không tìm thấy hóa đơn');
    }
    this.assertOwnerOrAdmin(actor, order.customerId);

    let invoice = await this.invoicesRepo.findByOrderId(orderId);
    if (!invoice) {
      const paymentIntent = await this.prisma.paymentIntent.findFirst({
        where: { orderId, status: 'PAID_MANUAL' },
        orderBy: { createdAt: 'desc' },
      });
      if (paymentIntent) {
        invoice = await this.ensureInvoiceForPayment(orderId, paymentIntent.id).then(
          (result) => (result ? this.invoicesRepo.findById(result.invoiceId) : null),
        );
      }
    }

    if (!invoice) {
      throw new DomainError('RESOURCE_NOT_FOUND', 404, 'Không tìm thấy hóa đơn');
    }

    return this.toView(invoice);
  }

  async getDownloadUrl(actor: AuthenticatedActor, invoiceId: string): Promise<string> {
    const invoice = await this.loadOwnedInvoice(actor, invoiceId);
    return this.storage.createReadUrl(invoice.pdfStorageKey, SIGNED_URL_TTL_SECONDS);
  }

  async sendEmail(actor: AuthenticatedActor, invoiceId: string, email: string): Promise<InvoiceView> {
    const invoice = await this.loadOwnedInvoice(actor, invoiceId);
    const link = await this.storage.createReadUrl(invoice.pdfStorageKey, SIGNED_URL_TTL_SECONDS);

    try {
      await this.mailProvider.sendInvoiceLink({
        to: email,
        customerName: invoice.customerName,
        invoiceNumber: invoice.invoiceNumber,
        link,
      });
    } catch (error) {
      this.logger.warn(`Invoice email send failed (invoice=${invoiceId}): ${error instanceof Error ? error.message : String(error)}`);
      throw new DomainError('MAIL_PROVIDER_FAILED', 502, 'Không thể gửi email hóa đơn, vui lòng thử lại');
    }

    await this.backfillCustomerEmail(invoice.orderId, email);

    const updated = await this.invoicesRepo.setEmailSent(invoice.id, new Date(), email);
    return this.toView(updated);
  }

  /**
   * Best-effort: only fills a still-null `User.email`, never overwrites one.
   * A collision with another account's unique email is swallowed — resend
   * still succeeds and the invoice's own `customerEmail` is set regardless.
   */
  private async backfillCustomerEmail(orderId: string, email: string): Promise<void> {
    try {
      const order = await this.ordersRepo.findById(orderId);
      if (!order) return;
      const user = await this.prisma.user.findUnique({ where: { id: order.customerId } });
      if (user && user.email === null) {
        await this.prisma.user.update({ where: { id: user.id }, data: { email } });
      }
    } catch (error) {
      this.logger.warn(`Could not backfill customer email (order=${orderId}): ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async trySendInvoiceEmail(invoice: Invoice): Promise<Invoice> {
    if (!invoice.customerEmail) {
      return invoice;
    }
    try {
      const link = await this.storage.createReadUrl(invoice.pdfStorageKey, SIGNED_URL_TTL_SECONDS);
      await this.mailProvider.sendInvoiceLink({
        to: invoice.customerEmail,
        customerName: invoice.customerName,
        invoiceNumber: invoice.invoiceNumber,
        link,
      });
      return this.invoicesRepo.setEmailSent(invoice.id, new Date());
    } catch (error) {
      this.logger.warn(`Invoice auto-email failed (invoice=${invoice.id}): ${error instanceof Error ? error.message : String(error)}`);
      return invoice;
    }
  }

  private async persistInvoiceOrReturnExisting(
    params: Parameters<InvoicesRepository['create']>[0],
  ): Promise<Invoice> {
    try {
      return await this.invoicesRepo.create(params);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        const existing = await this.invoicesRepo.findByOrderId(params.orderId);
        if (existing) {
          return existing;
        }
      }
      throw error;
    }
  }

  private async reserveInvoiceNumber(): Promise<string> {
    const year = new Date().getFullYear();
    return this.invoicesRepo.runTransaction((tx) => this.invoicesRepo.reserveNextInvoiceNumber(year, tx));
  }

  private async loadOwnedInvoice(actor: AuthenticatedActor, invoiceId: string): Promise<Invoice> {
    const invoice = await this.invoicesRepo.findById(invoiceId);
    if (!invoice) {
      throw new DomainError('RESOURCE_NOT_FOUND', 404, 'Không tìm thấy hóa đơn');
    }
    const order = await this.ordersRepo.findById(invoice.orderId);
    if (!order) {
      throw new DomainError('RESOURCE_NOT_FOUND', 404, 'Không tìm thấy hóa đơn');
    }
    this.assertOwnerOrAdmin(actor, order.customerId);
    return invoice;
  }

  private assertOwnerOrAdmin(actor: AuthenticatedActor, customerId: string): void {
    if (actor.role !== 'ADMIN' && actor.userId !== customerId) {
      throw new DomainError('RESOURCE_NOT_FOUND', 404, 'Không tìm thấy hóa đơn');
    }
  }

  private async toView(invoice: Invoice): Promise<InvoiceView> {
    const viewUrl = await this.storage.createReadUrl(invoice.pdfStorageKey, SIGNED_URL_TTL_SECONDS);
    return {
      id: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      amountVnd: invoice.amountVnd,
      vatRateVnd: invoice.vatRateVnd,
      totalVnd: invoice.totalVnd,
      issuedAt: invoice.issuedAt.toISOString(),
      emailSentAt: invoice.emailSentAt ? invoice.emailSentAt.toISOString() : null,
      viewUrl,
    };
  }
}
