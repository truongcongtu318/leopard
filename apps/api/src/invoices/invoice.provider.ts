import { Injectable } from '@nestjs/common';
import { PdfService } from '../pdf/pdf.service.js';

const VAT_RATE = 0.1;

export interface InvoiceInput {
  readonly invoiceNumber: string;
  readonly issuedAt: Date;
  readonly orderReference: string;
  readonly customerName: string;
  readonly customerEmail?: string;
  readonly customerTaxCode?: string;
  readonly customerAddress?: string;
  /** Authoritative amount, snapshotted from `PaymentIntent.amountVnd` — never `Order.priceVnd`. */
  readonly amountVnd: number;
}

export interface GeneratedInvoice {
  readonly vatRateVnd: number;
  readonly totalVnd: number;
  readonly pdfBuffer: Buffer;
}

/**
 * Pure invoice-content computation + PDF rendering. Deliberately does NOT
 * allocate the invoice number — that is reserved transactionally by
 * `InvoicesService` (via `InvoiceSequence`) before this is called, so a
 * database transaction is never held open while this renders a PDF (mirrors
 * the discipline in `DriverContractService`).
 */
export abstract class InvoiceProvider {
  abstract generate(input: InvoiceInput): Promise<GeneratedInvoice>;
}

@Injectable()
export class SelfGeneratedInvoiceProvider extends InvoiceProvider {
  constructor(private readonly pdf: PdfService) {
    super();
  }

  async generate(input: InvoiceInput): Promise<GeneratedInvoice> {
    if (!Number.isInteger(input.amountVnd) || input.amountVnd < 0) {
      throw new Error('amountVnd must be a non-negative integer');
    }

    // Integer VND only, no floating-point drift: round to nearest đồng.
    const vatRateVnd = Math.round(input.amountVnd * VAT_RATE);
    const totalVnd = input.amountVnd + vatRateVnd;

    const pdfBuffer = await this.pdf.renderInvoice({
      invoiceNumber: input.invoiceNumber,
      issuedAt: input.issuedAt,
      customerName: input.customerName,
      ...(input.customerEmail ? { customerEmail: input.customerEmail } : {}),
      ...(input.customerTaxCode ? { customerTaxCode: input.customerTaxCode } : {}),
      ...(input.customerAddress ? { customerAddress: input.customerAddress } : {}),
      orderReference: input.orderReference,
      lineItems: [{ label: 'Cước phí vận chuyển', amountVnd: input.amountVnd }],
      amountVnd: input.amountVnd,
      vatRateVnd,
      totalVnd,
    });

    return { vatRateVnd, totalVnd, pdfBuffer };
  }
}

/** Placeholder for a future authority-issued e-invoice integration. */
export class EInvoiceProvider extends InvoiceProvider {
  async generate(_input: InvoiceInput): Promise<GeneratedInvoice> {
    throw new Error('EInvoiceProvider is not configured: no real e-invoice provider is integrated yet');
  }
}
