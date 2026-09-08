import { describe, expect, it } from '@jest/globals';
import { renderInvoicePdf } from './render-invoice-pdf.js';
import type { InvoicePdfInput } from './pdf.types.js';

const baseInput: InvoicePdfInput = {
  invoiceNumber: 'LP/2026/000001',
  issuedAt: new Date('2026-09-08T00:00:00.000Z'),
  customerName: 'Nguyễn Văn A',
  orderReference: 'order-1',
  lineItems: [{ label: 'Cước phí vận chuyển', amountVnd: 480_000 }],
  amountVnd: 480_000,
  vatRateVnd: 48_000,
  totalVnd: 528_000,
};

describe('renderInvoicePdf', () => {
  it('renders a valid, non-empty PDF buffer for the standard case', async () => {
    const buffer = await renderInvoicePdf(baseInput);
    expect(buffer.subarray(0, 5).toString('latin1')).toBe('%PDF-');
    expect(buffer.length).toBeGreaterThan(1000);
  });

  it('renders without throwing when optional customer fields are absent', async () => {
    await expect(renderInvoicePdf(baseInput)).resolves.toBeInstanceOf(Buffer);
  });

  it('renders without throwing when optional customer fields are present', async () => {
    const withOptional: InvoicePdfInput = {
      ...baseInput,
      customerEmail: 'a@vidu.com',
      customerTaxCode: '0123456789',
      customerAddress: '123 Đường ABC, Quận 1, TP.HCM',
    };
    await expect(renderInvoicePdf(withOptional)).resolves.toBeInstanceOf(Buffer);
  });

  it('renders without throwing for a zero-amount invoice', async () => {
    const zero: InvoicePdfInput = {
      ...baseInput,
      lineItems: [{ label: 'Cước phí vận chuyển', amountVnd: 0 }],
      amountVnd: 0,
      vatRateVnd: 0,
      totalVnd: 0,
    };
    await expect(renderInvoicePdf(zero)).resolves.toBeInstanceOf(Buffer);
  });

  it('renders without throwing for multiple line items', async () => {
    const multi: InvoicePdfInput = {
      ...baseInput,
      lineItems: [
        { label: 'Cước phí vận chuyển', amountVnd: 400_000 },
        { label: 'Phụ phí giao gấp', amountVnd: 80_000 },
      ],
    };
    await expect(renderInvoicePdf(multi)).resolves.toBeInstanceOf(Buffer);
  });
});
