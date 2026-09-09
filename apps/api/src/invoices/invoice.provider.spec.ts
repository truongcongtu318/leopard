import { beforeEach, describe, expect, it, jest } from '@jest/globals';

import { EInvoiceProvider, SelfGeneratedInvoiceProvider } from './invoice.provider.js';

function createMocks() {
  const pdf = {
    renderInvoice: jest.fn(async () => Buffer.from('%PDF-fake')),
  };
  return { pdf };
}

const baseInput = {
  invoiceNumber: 'LP/2026/000001',
  issuedAt: new Date('2026-09-08T00:00:00.000Z'),
  orderReference: 'order-1',
  customerName: 'Nguyễn Văn A',
  amountVnd: 480_000,
};

describe('SelfGeneratedInvoiceProvider', () => {
  let mocks: ReturnType<typeof createMocks>;
  let provider: SelfGeneratedInvoiceProvider;

  beforeEach(() => {
    jest.clearAllMocks();
    mocks = createMocks();
    provider = new SelfGeneratedInvoiceProvider(mocks.pdf as never);
  });

  it('computes 10% VAT and total for a representative fare', async () => {
    const result = await provider.generate({ ...baseInput, amountVnd: 480_000 });

    expect(result.vatRateVnd).toBe(48_000);
    expect(result.totalVnd).toBe(528_000);
    expect(Number.isInteger(result.vatRateVnd)).toBe(true);
    expect(Number.isInteger(result.totalVnd)).toBe(true);
  });

  it('rounds a zero amount to a zero VAT and total', async () => {
    const result = await provider.generate({ ...baseInput, amountVnd: 0 });

    expect(result.vatRateVnd).toBe(0);
    expect(result.totalVnd).toBe(0);
  });

  it('rounds down at the sub-đồng boundary (amountVnd = 1 -> vat 0.1 -> 0)', async () => {
    const result = await provider.generate({ ...baseInput, amountVnd: 1 });

    expect(result.vatRateVnd).toBe(0);
    expect(result.totalVnd).toBe(1);
  });

  it('rounds half up at the exact .5 boundary (amountVnd = 5 -> vat 0.5 -> 1)', async () => {
    const result = await provider.generate({ ...baseInput, amountVnd: 5 });

    expect(result.vatRateVnd).toBe(1);
    expect(result.totalVnd).toBe(6);
  });

  it('rejects a negative amount without rendering a PDF', async () => {
    await expect(provider.generate({ ...baseInput, amountVnd: -1 })).rejects.toThrow(
      'amountVnd must be a non-negative integer',
    );
    expect(mocks.pdf.renderInvoice).not.toHaveBeenCalled();
  });

  it('rejects a non-integer amount without rendering a PDF', async () => {
    await expect(provider.generate({ ...baseInput, amountVnd: 100.5 })).rejects.toThrow(
      'amountVnd must be a non-negative integer',
    );
    expect(mocks.pdf.renderInvoice).not.toHaveBeenCalled();
  });

  it('passes the computed VAT/total and a single line item matching amountVnd to PdfService', async () => {
    await provider.generate({ ...baseInput, amountVnd: 480_000 });

    expect(mocks.pdf.renderInvoice).toHaveBeenCalledWith(
      expect.objectContaining({
        invoiceNumber: baseInput.invoiceNumber,
        amountVnd: 480_000,
        vatRateVnd: 48_000,
        totalVnd: 528_000,
        lineItems: [{ label: 'Cước phí vận chuyển', amountVnd: 480_000 }],
      }),
    );
  });

  it('omits optional customer fields from the PDF input when not provided', async () => {
    await provider.generate(baseInput);

    const passedInput = mocks.pdf.renderInvoice.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(passedInput).not.toHaveProperty('customerEmail');
    expect(passedInput).not.toHaveProperty('customerTaxCode');
    expect(passedInput).not.toHaveProperty('customerAddress');
  });

  it('returns the exact buffer PdfService resolves with', async () => {
    const fakeBuffer = Buffer.from('%PDF-distinct-buffer');
    mocks.pdf.renderInvoice.mockResolvedValueOnce(fakeBuffer);

    const result = await provider.generate(baseInput);

    expect(result.pdfBuffer).toBe(fakeBuffer);
  });
});

describe('EInvoiceProvider', () => {
  it('rejects with a clear, non-generic error instead of silently no-opping', async () => {
    const provider = new EInvoiceProvider();

    await expect(provider.generate(baseInput)).rejects.toThrow(
      'EInvoiceProvider is not configured: no real e-invoice provider is integrated yet',
    );
  });
});
