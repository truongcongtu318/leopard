# VAT Invoice: PDF Chuẩn Hóa + Xem Trước In-App Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the self-issued VAT invoice PDF into a standard Vietnamese invoice layout, and replace the mobile app's stale `Linking.openURL(invoice.viewUrl)` with an in-app WebView preview that calls `GET /invoices/:id/download` at open time.

**Architecture:** Backend: keep the existing `pdfkit` pipeline (`render-invoice-pdf.ts`) and `InvoicePdfInput` shape untouched at the type level; only the render function's internals change (header/seller/buyer/table/totals/signature sections, a hand-drawn line-items table, and a new Vietnamese amount-in-words helper). No change to `invoice.provider.ts`'s tax math. Mobile: add `react-native-webview`, add a new thin route `app/customer/invoice-preview.tsx` → `InvoicePreviewScreen`, change the `onOpenInvoice` callback contract from `(viewUrl: string)` to `(invoiceId: string)` end-to-end, and add a redirect-following URL resolver (`getInvoiceDownloadUrl`) used only for the "open in external browser" fallback button.

**Tech Stack:** NestJS + pdfkit + Prisma (API); Expo Router + React Native + TanStack Query + `react-native-webview` (mobile); Jest for both.

**Spec:** `docs/superpowers/handoffs/2026-09-08-invoice-pdf-standard-format-preview-prompt.md` (binding decisions, API gap table, layout requirements, mobile approach). Also see `docs/superpowers/plans/2026-09-05-vat-invoice-plan.md` and `docs/superpowers/specs/2026-09-05-vat-invoice-design.md` for original feature context.

## Global Constraints

- Do not add a second PDF library — only `pdfkit` (already a dependency).
- Do not add a new font — only `PDF_FONT_REGULAR_PATH` / `PDF_FONT_BOLD_PATH` from `apps/api/src/pdf/fonts.ts` (Roboto, Vietnamese-safe).
- Keep the existing deterministic date formatter pattern: `Intl.DateTimeFormat('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', ... })`.
- Do not change the VAT/total computation in `apps/api/src/invoices/invoice.provider.ts` (`vatRateVnd = Math.round(amountVnd * 0.1)`, `totalVnd = amountVnd + vatRateVnd`) — Task 1 only changes PDF presentation.
- `InvoicePdfInput` (in `apps/api/src/pdf/pdf.types.ts`) keeps its current field set — seller info is a hardcoded constant inside the render module, not a new input field, so `invoice.provider.spec.ts`'s existing `toHaveBeenCalledWith(expect.objectContaining({...}))` assertions keep passing unmodified.
- Seller info (per user decision 2026-09-08): placeholder values — company name "Công ty TNHH Leopard Logistics", tax code left blank, address left blank — hardcoded in `apps/api/src/pdf/invoice-template.ts`, not an env var.
- Keep the mandatory disclaimer line ("hóa đơn tự phát hành... không phải hóa đơn điện tử được cơ quan thuế cấp mã") visible near the top, as today.
- Mobile: install WebView via `npx expo install react-native-webview` (not `npm add`) so the native module version is pinned to Expo SDK 57.
- Mobile: preview screen must call `GET /invoices/:id/download` at the moment the screen opens (fresh signed URL, TTL 3600s) — never reuse a `viewUrl` fetched earlier from order-detail.
- Mobile: `onOpenInvoice` changes from `(viewUrl: string) => void` to `(invoiceId: string) => void` everywhere — this is a real interface change, not just internal behavior.
- Every touched file stays ≤800 lines, functions ≤50 lines, nesting ≤4 levels.
- This branch (`feature/mobile-ui-refactor`) has ~207 unrelated dirty files from other in-progress work. Every `git add` in this plan MUST list explicit file paths — never `git add -A` / `git add .`.
- Never let a test hit real SMTP — `PdfService`/`MailProvider` stay mocked exactly as `invoices.e2e-spec.ts` and `invoices.service.spec.ts` already do; this plan does not touch those mocks.

---

## Task 1: Vietnamese amount-in-words helper

**Files:**
- Create: `apps/api/src/pdf/vnd-to-words.ts`
- Test: `apps/api/src/pdf/vnd-to-words.spec.ts`

**Interfaces:**
- Produces: `export function vndAmountToWords(amountVnd: number): string` — returns a capitalized Vietnamese sentence ending in "đồng" (e.g. `528000` → `"Năm trăm hai mươi tám nghìn đồng"`), used by Task 3's `render-invoice-pdf.ts`.

- [ ] **Step 1: Write the failing tests**

```typescript
// apps/api/src/pdf/vnd-to-words.spec.ts
import { describe, expect, it } from '@jest/globals';
import { vndAmountToWords } from './vnd-to-words.js';

describe('vndAmountToWords', () => {
  it('renders zero', () => {
    expect(vndAmountToWords(0)).toBe('Không đồng');
  });

  it('renders a single-digit amount', () => {
    expect(vndAmountToWords(5)).toBe('Năm đồng');
  });

  it('renders a representative fare total (528,000)', () => {
    expect(vndAmountToWords(528_000)).toBe('Năm trăm hai mươi tám nghìn đồng');
  });

  it('renders a value with a "lẻ" gap (1,005,000)', () => {
    expect(vndAmountToWords(1_005_000)).toBe('Một triệu không trăm lẻ năm nghìn đồng');
  });

  it('renders "mười" instead of "một mươi" for the tens group', () => {
    expect(vndAmountToWords(10_000)).toBe('Mười nghìn đồng');
  });

  it('renders "mốt" instead of "một" for a trailing 1 above 20', () => {
    expect(vndAmountToWords(21_000)).toBe('Hai mươi mốt nghìn đồng');
  });

  it('renders "lăm" instead of "năm" for a trailing 5 above 10', () => {
    expect(vndAmountToWords(25_000)).toBe('Hai mươi lăm nghìn đồng');
  });

  it('renders a value spanning billions', () => {
    expect(vndAmountToWords(1_234_567_000)).toBe(
      'Một tỷ hai trăm ba mươi tư triệu năm trăm sáu mươi bảy nghìn đồng',
    );
  });

  it('rounds a fractional đồng down before rendering', () => {
    expect(vndAmountToWords(1_000.9)).toBe('Một nghìn đồng');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd apps/api && npx jest src/pdf/vnd-to-words.spec.ts`
Expected: FAIL — `Cannot find module './vnd-to-words.js'`

- [ ] **Step 3: Write the implementation**

```typescript
// apps/api/src/pdf/vnd-to-words.ts
/**
 * Vietnamese number-to-words for VND amounts, standard invoice convention:
 * grouped by 3 digits (triệu/nghìn), "lẻ" fills an internal zero hundreds
 * group, "mười" replaces "một mươi", "mốt"/"lăm" replace trailing "một"/"năm"
 * above ten. Deterministic and locale-independent (no Intl reliance) so PDF
 * output stays byte-stable across environments.
 */

const DIGITS_VI = [
  'không', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín',
] as const;

const GROUP_UNITS = ['', 'nghìn', 'triệu', 'tỷ'] as const;

function readThreeDigits(group: number, isFirstGroup: boolean): string {
  const hundreds = Math.floor(group / 100);
  const tens = Math.floor((group % 100) / 10);
  const ones = group % 10;
  const parts: string[] = [];

  if (hundreds > 0 || !isFirstGroup) {
    parts.push(DIGITS_VI[hundreds], 'trăm');
  }

  if (tens === 0) {
    if (ones > 0 && (hundreds > 0 || !isFirstGroup)) {
      parts.push('lẻ');
    }
  } else if (tens === 1) {
    parts.push('mười');
  } else {
    parts.push(DIGITS_VI[tens], 'mươi');
  }

  if (ones === 1 && tens >= 2) {
    parts.push('mốt');
  } else if (ones === 5 && tens >= 1) {
    parts.push('lăm');
  } else if (ones > 0) {
    parts.push(DIGITS_VI[ones]);
  }

  return parts.join(' ');
}

export function vndAmountToWords(amountVnd: number): string {
  const value = Math.floor(Math.max(0, amountVnd));
  if (value === 0) {
    return 'Không đồng';
  }

  const groups: number[] = [];
  let remaining = value;
  while (remaining > 0) {
    groups.unshift(remaining % 1000);
    remaining = Math.floor(remaining / 1000);
  }

  const words: string[] = [];
  for (let i = 0; i < groups.length; i++) {
    const group = groups[i];
    if (group === 0) continue;
    const isFirstGroup = i === 0;
    const unit = GROUP_UNITS[groups.length - 1 - i];
    words.push(readThreeDigits(group, isFirstGroup && i === groups.length - 1 ? true : i === 0));
    if (unit) words.push(unit);
  }

  const sentence = words.join(' ').replace(/\s+/g, ' ').trim();
  return `${sentence.charAt(0).toUpperCase()}${sentence.slice(1)} đồng`;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd apps/api && npx jest src/pdf/vnd-to-words.spec.ts`
Expected: PASS (all 9 cases). If the "lẻ" or billions case fails, trace `readThreeDigits`'s `isFirstGroup` handling for that specific group — do not weaken the assertions to match a wrong implementation.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/pdf/vnd-to-words.ts apps/api/src/pdf/vnd-to-words.spec.ts
git commit -m "feat(api): add Vietnamese amount-in-words helper for invoice PDF

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 2: Seller info constants

**Files:**
- Create: `apps/api/src/pdf/invoice-template.ts`

**Interfaces:**
- Produces: `export const INVOICE_SELLER: InvoiceSellerDetails` and `export interface InvoiceSellerDetails { readonly companyName: string; readonly taxCode: string | null; readonly address: string | null; }` — consumed by Task 3's `render-invoice-pdf.ts`.

- [ ] **Step 1: Write the file** (no test needed — this is a static data constant, mirrors `driver-contract-template.ts`'s `DRIVER_CONTRACT_PREVIEW_PARTY_DETAILS` pattern which is also untested as a plain constant)

```typescript
// apps/api/src/pdf/invoice-template.ts
/**
 * Fixed "Bên bán" (seller) details for the self-issued invoice PDF. This is
 * a pilot-stage placeholder (user decision 2026-09-08) — not sourced from
 * env vars because it is not a secret and does not vary by deployment yet.
 * Update these constants directly when real company registration details
 * are available; do not thread them through InvoicePdfInput unless a future
 * requirement needs per-tenant sellers.
 */

export interface InvoiceSellerDetails {
  readonly companyName: string;
  readonly taxCode: string | null;
  readonly address: string | null;
}

export const INVOICE_SELLER: InvoiceSellerDetails = {
  companyName: 'Công ty TNHH Leopard Logistics',
  taxCode: null,
  address: null,
};
```

- [ ] **Step 2: Commit**

```bash
git add apps/api/src/pdf/invoice-template.ts
git commit -m "feat(api): add placeholder seller details for invoice PDF

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 3: Redesign the invoice PDF layout

**Files:**
- Modify: `apps/api/src/pdf/render-invoice-pdf.ts`
- Test: `apps/api/src/pdf/render-invoice-pdf.spec.ts` (new — no existing test file for this render function; only smoke-level structural assertions are practical against a binary PDF buffer)

**Interfaces:**
- Consumes: `InvoicePdfInput` (unchanged, from `apps/api/src/pdf/pdf.types.ts`), `vndAmountToWords` (Task 1), `INVOICE_SELLER` (Task 2), `PDF_FONT_BOLD_PATH`/`PDF_FONT_REGULAR_PATH` (existing `fonts.ts`).
- Produces: `export function renderInvoicePdf(input: InvoicePdfInput): Promise<Buffer>` — same signature as today, consumed by `apps/api/src/pdf/pdf.service.ts`'s `renderInvoice` (no change needed there).

- [ ] **Step 1: Write the failing test**

A full pdfkit visual diff is out of scope; assert the buffer is well-formed and non-trivially larger than the old flat-text version (proxy for "a table was actually drawn"), and that rendering does not throw for the boundary cases already covered by `invoice.provider.spec.ts` (zero amount, missing optional customer fields).

```typescript
// apps/api/src/pdf/render-invoice-pdf.spec.ts
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
```

- [ ] **Step 2: Run test to verify current behavior**

Run: `cd apps/api && npx jest src/pdf/render-invoice-pdf.spec.ts`
Expected: PASS already (the old flat-text renderer satisfies these loose smoke assertions) — this is expected; the point of this suite is to catch a regression (a throw, or a truncated/invalid buffer) introduced by the Step 3 rewrite, not to prove the new layout exists. Proceed to the rewrite.

- [ ] **Step 3: Rewrite the render function**

```typescript
// apps/api/src/pdf/render-invoice-pdf.ts
import PDFDocument from 'pdfkit';
import { PDF_FONT_BOLD_PATH, PDF_FONT_REGULAR_PATH } from './fonts.js';
import { INVOICE_SELLER } from './invoice-template.js';
import type { InvoicePdfInput } from './pdf.types.js';
import { vndAmountToWords } from './vnd-to-words.js';

const PAGE_MARGIN_PT = 56;
const FONT_BODY = 'Body';
const FONT_HEADING = 'Heading';
const CONTENT_WIDTH_PT = 595.28 - 2 * PAGE_MARGIN_PT; // A4 width - margins

// Fixed, locale-explicit formatting so the same input always renders
// identical bytes regardless of the host machine's default locale/timezone.
const INVOICE_DATE_FORMATTER = new Intl.DateTimeFormat('vi-VN', {
  timeZone: 'Asia/Ho_Chi_Minh',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
});

const INVOICE_CURRENCY_FORMATTER = new Intl.NumberFormat('vi-VN');

function formatInvoiceDate(date: Date): string {
  return INVOICE_DATE_FORMATTER.format(date);
}

function formatVnd(amountVnd: number): string {
  return `${INVOICE_CURRENCY_FORMATTER.format(amountVnd)} ₫`;
}

function renderHeader(doc: PDFKit.PDFDocument, input: InvoicePdfInput): void {
  doc.font(FONT_HEADING).fontSize(16).text('HÓA ĐƠN GIÁ TRỊ GIA TĂNG', { align: 'center' });
  doc.font(FONT_BODY).fontSize(9).fillColor('#666666');
  doc.text('(Tự phát hành — không phải hóa đơn điện tử có mã cơ quan thuế)', {
    align: 'center',
  });
  doc.fillColor('#000000');
  doc.moveDown(0.4);
  doc.font(FONT_BODY).fontSize(10);
  doc.text(`Số hóa đơn: ${input.invoiceNumber}`, { align: 'center' });
  doc.text(`Ngày lập: ${formatInvoiceDate(input.issuedAt)}`, { align: 'center' });
  doc.moveDown(0.75);
}

function renderSellerFields(doc: PDFKit.PDFDocument): void {
  doc.font(FONT_HEADING).fontSize(11).text('Đơn vị phát hành (Bên bán)');
  doc.moveDown(0.15);
  doc.font(FONT_BODY).fontSize(10);
  doc.text(`Tên đơn vị: ${INVOICE_SELLER.companyName}`);
  if (INVOICE_SELLER.taxCode) {
    doc.text(`Mã số thuế: ${INVOICE_SELLER.taxCode}`);
  }
  if (INVOICE_SELLER.address) {
    doc.text(`Địa chỉ: ${INVOICE_SELLER.address}`);
  }
  doc.moveDown(0.6);
}

function renderCustomerFields(doc: PDFKit.PDFDocument, input: InvoicePdfInput): void {
  doc.font(FONT_HEADING).fontSize(11).text('Người mua hàng (Bên mua)');
  doc.moveDown(0.15);
  doc.font(FONT_BODY).fontSize(10);
  doc.text(`Tên khách hàng: ${input.customerName}`);
  doc.text(`Đơn hàng tham chiếu: ${input.orderReference}`);
  if (input.customerEmail) {
    doc.text(`Email: ${input.customerEmail}`);
  }
  if (input.customerTaxCode) {
    doc.text(`Mã số thuế: ${input.customerTaxCode}`);
  }
  if (input.customerAddress) {
    doc.text(`Địa chỉ: ${input.customerAddress}`);
  }
  doc.moveDown(0.6);
}

// Column widths (points), summing to CONTENT_WIDTH_PT: STT, Tên hàng hóa,
// ĐVT, SL, Đơn giá, Thành tiền.
const TABLE_COLUMNS = [
  { label: 'STT', width: 28, align: 'center' as const },
  { label: 'Tên hàng hóa, dịch vụ', width: 175, align: 'left' as const },
  { label: 'ĐVT', width: 45, align: 'center' as const },
  { label: 'SL', width: 30, align: 'center' as const },
  { label: 'Đơn giá', width: 90, align: 'right' as const },
  { label: 'Thành tiền', width: CONTENT_WIDTH_PT - (28 + 175 + 45 + 30 + 90), align: 'right' as const },
];
const TABLE_ROW_HEIGHT_PT = 20;

function columnX(index: number): number {
  let x = PAGE_MARGIN_PT;
  for (let i = 0; i < index; i++) x += TABLE_COLUMNS[i].width;
  return x;
}

function renderTableRow(
  doc: PDFKit.PDFDocument,
  y: number,
  cells: readonly string[],
  options: { readonly bold?: boolean } = {},
): void {
  doc.font(options.bold ? FONT_HEADING : FONT_BODY).fontSize(9.5);
  cells.forEach((cell, i) => {
    const column = TABLE_COLUMNS[i];
    doc.text(cell, columnX(i) + 4, y + 5, { width: column.width - 8, align: column.align });
  });
}

function renderTableGrid(doc: PDFKit.PDFDocument, top: number, rowCount: number): void {
  const height = TABLE_ROW_HEIGHT_PT * rowCount;
  doc.lineWidth(0.75).strokeColor('#333333');
  // Horizontal lines
  for (let i = 0; i <= rowCount; i++) {
    const y = top + i * TABLE_ROW_HEIGHT_PT;
    doc.moveTo(PAGE_MARGIN_PT, y).lineTo(PAGE_MARGIN_PT + CONTENT_WIDTH_PT, y).stroke();
  }
  // Vertical lines
  for (let i = 0; i <= TABLE_COLUMNS.length; i++) {
    const x = columnX(i);
    doc.moveTo(x, top).lineTo(x, top + height).stroke();
  }
  doc.strokeColor('#000000');
}

function renderLineItemsTable(doc: PDFKit.PDFDocument, input: InvoicePdfInput): number {
  doc.font(FONT_HEADING).fontSize(11).text('Chi tiết hàng hóa, dịch vụ');
  doc.moveDown(0.2);

  const tableTop = doc.y;
  const rowCount = 1 + input.lineItems.length; // header + one row per item
  renderTableGrid(doc, tableTop, rowCount);
  renderTableRow(
    doc,
    tableTop,
    TABLE_COLUMNS.map((c) => c.label),
    { bold: true },
  );

  input.lineItems.forEach((item, i) => {
    const rowY = tableTop + (i + 1) * TABLE_ROW_HEIGHT_PT;
    renderTableRow(doc, rowY, [
      String(i + 1),
      item.label,
      'Chuyến',
      '1',
      formatVnd(item.amountVnd),
      formatVnd(item.amountVnd),
    ]);
  });

  doc.y = tableTop + rowCount * TABLE_ROW_HEIGHT_PT;
  doc.moveDown(0.75);
  return doc.y;
}

function renderTotals(doc: PDFKit.PDFDocument, input: InvoicePdfInput): void {
  doc.font(FONT_BODY).fontSize(10);
  doc.text(`Cộng tiền hàng: ${formatVnd(input.amountVnd)}`, { align: 'right' });
  doc.text(`Thuế suất GTGT (10%): ${formatVnd(input.vatRateVnd)}`, { align: 'right' });
  doc.font(FONT_HEADING).fontSize(11);
  doc.text(`Tổng cộng tiền thanh toán: ${formatVnd(input.totalVnd)}`, { align: 'right' });
  doc.font(FONT_BODY).fontSize(9.5).fillColor('#333333');
  doc.text(`Số tiền viết bằng chữ: ${vndAmountToWords(input.totalVnd)}.`, { align: 'right' });
  doc.fillColor('#000000');
  doc.moveDown(1);
}

function renderSignatureBlock(doc: PDFKit.PDFDocument): void {
  const startY = doc.y;
  const columnWidth = CONTENT_WIDTH_PT / 2;
  doc.font(FONT_HEADING).fontSize(10);
  doc.text('Người mua hàng', PAGE_MARGIN_PT, startY, { width: columnWidth, align: 'center' });
  doc.text('Người bán hàng', PAGE_MARGIN_PT + columnWidth, startY, {
    width: columnWidth,
    align: 'center',
  });
  doc.font(FONT_BODY).fontSize(8).fillColor('#666666');
  doc.text('(Ký, ghi rõ họ tên)', PAGE_MARGIN_PT, startY + 14, {
    width: columnWidth,
    align: 'center',
  });
  doc.text('(Ký, ghi rõ họ tên)', PAGE_MARGIN_PT + columnWidth, startY + 14, {
    width: columnWidth,
    align: 'center',
  });
  doc.fillColor('#000000');
}

/**
 * Invoice-oriented render function: mirrors render-contract-pdf.ts (same
 * pdfkit pipeline, same embedded Vietnamese-safe fonts, same deterministic
 * page margins and locale-explicit date formatting). Pure — no HTTP calls,
 * no DB reads. Layout follows the common Vietnamese VAT-invoice form
 * (Nghị định 123/2020/NĐ-CP) for visual reference only — this is a
 * self-issued invoice, not a tax-authority-coded e-invoice.
 */
export function renderInvoicePdf(input: InvoicePdfInput): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    const doc = new PDFDocument({
      size: 'A4',
      margins: {
        top: PAGE_MARGIN_PT,
        bottom: PAGE_MARGIN_PT,
        left: PAGE_MARGIN_PT,
        right: PAGE_MARGIN_PT,
      },
      info: {
        Title: `Hóa đơn ${input.invoiceNumber}`,
        Author: 'Leopard',
        CreationDate: input.issuedAt,
      },
    });

    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', (error: Error) => reject(error));

    doc.registerFont(FONT_BODY, PDF_FONT_REGULAR_PATH);
    doc.registerFont(FONT_HEADING, PDF_FONT_BOLD_PATH);

    renderHeader(doc, input);
    renderSellerFields(doc);
    renderCustomerFields(doc, input);
    renderLineItemsTable(doc, input);
    renderTotals(doc, input);
    renderSignatureBlock(doc);

    doc.end();
  });
}
```

- [ ] **Step 4: Run tests to verify they still pass**

Run: `cd apps/api && npx jest src/pdf/render-invoice-pdf.spec.ts`
Expected: PASS. If pdfkit throws inside `renderTableRow`/`renderTableGrid` (e.g. a column width miscalculation making `width` negative), fix the `TABLE_COLUMNS` widths so they sum exactly to `CONTENT_WIDTH_PT` — do not catch-and-ignore the error.

- [ ] **Step 5: Run the full invoice test suite to confirm no regression**

Run: `cd apps/api && npx jest src/invoices src/pdf`
Expected: PASS — `invoice.provider.spec.ts` must still pass unmodified (Global Constraints: `InvoicePdfInput` shape unchanged). `invoices.e2e-spec.ts` and `invoices.service.spec.ts` mock `PdfService` entirely so they are unaffected by this render rewrite.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/pdf/render-invoice-pdf.ts apps/api/src/pdf/render-invoice-pdf.spec.ts
git commit -m "feat(api): redesign invoice PDF to standard VAT-invoice layout

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 4: Add `getInvoiceDownloadUrl` to the mobile customer adapter

**Files:**
- Modify: `apps/mobile/src/features/customer/orders/port.ts`
- Modify: `apps/mobile/src/features/customer/orders/adapter.ts`
- Test: `apps/mobile/src/features/customer/orders/adapter.test.ts`

**Interfaces:**
- Produces: `getInvoiceDownloadUrl: (invoiceId: string) => Promise<string>` on `CustomerOrdersPort`, added to `createCustomerHttpAdapter()`'s returned object. Resolves the signed storage URL by following the API's 302 redirect manually (the endpoint returns `Location`, not JSON, so it cannot go through `activeClient.get<T>`, which requires a JSON body). Consumed by Task 6's fallback "Open in browser" button.

- [ ] **Step 1: Write the failing test**

```typescript
// apps/mobile/src/features/customer/orders/adapter.test.ts
// (append to existing describe blocks in this file)
describe('getInvoiceDownloadUrl', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('resolves the signed URL from the redirect Location header', async () => {
    global.fetch = jest.fn(async () => ({
      status: 302,
      headers: { get: (name: string) => (name === 'Location' ? 'https://signed.example/x.pdf' : null) },
    })) as unknown as typeof fetch;

    const adapter = createCustomerHttpAdapter();
    const url = await adapter.getInvoiceDownloadUrl!('invoice-1');

    expect(url).toBe('https://signed.example/x.pdf');
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/invoices/invoice-1/download'),
      expect.objectContaining({ redirect: 'manual' }),
    );
  });

  it('throws when the server does not return a redirect', async () => {
    global.fetch = jest.fn(async () => ({
      status: 404,
      headers: { get: () => null },
    })) as unknown as typeof fetch;

    const adapter = createCustomerHttpAdapter();
    await expect(adapter.getInvoiceDownloadUrl!('invoice-1')).rejects.toThrow();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/mobile && npx jest src/features/customer/orders/adapter.test.ts -t getInvoiceDownloadUrl`
Expected: FAIL — `adapter.getInvoiceDownloadUrl is not a function`

- [ ] **Step 3: Implement**

In `apps/mobile/src/features/customer/orders/port.ts`, add to `CustomerOrdersPort`:

```typescript
  getInvoiceDownloadUrl?: (invoiceId: string) => Promise<string>;
```

In `apps/mobile/src/features/customer/orders/adapter.ts`, inside `createCustomerHttpAdapter()`'s returned object (near `sendInvoiceEmail`, using the same `EXPO_PUBLIC_API_URL` base and `sessionStore` token pattern already used by `http-client.ts:6,199-201`):

```typescript
    async getInvoiceDownloadUrl(invoiceId: string): Promise<string> {
      const { sessionStore } = require('../../../auth/session-store');
      const base = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api/v1';
      const token = sessionStore.getAccessToken();
      const response = await fetch(`${base}/invoices/${invoiceId}/download`, {
        method: 'GET',
        redirect: 'manual',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const location = response.headers.get('Location');
      if (!location) {
        throw new ApiError('INVALID_RESPONSE', 'Không lấy được liên kết hóa đơn.');
      }
      return location;
    },
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/mobile && npx jest src/features/customer/orders/adapter.test.ts -t getInvoiceDownloadUrl`
Expected: PASS

- [ ] **Step 5: Run the full adapter test file to confirm no regression**

Run: `cd apps/mobile && npx jest src/features/customer/orders/adapter.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add apps/mobile/src/features/customer/orders/port.ts apps/mobile/src/features/customer/orders/adapter.ts apps/mobile/src/features/customer/orders/adapter.test.ts
git commit -m "feat(mobile): add getInvoiceDownloadUrl resolving the signed PDF URL

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 5: Install `react-native-webview`

**Files:**
- Modify: `apps/mobile/package.json` (via Expo CLI, not manual edit)

- [ ] **Step 1: Install**

Run: `cd apps/mobile && npx expo install react-native-webview`
Expected: `package.json` and `package-lock.json`/`pnpm-lock.yaml` (whichever this repo uses — check which lockfile exists first) gain the entry, pinned to the version compatible with Expo SDK 57.

- [ ] **Step 2: Verify**

Run: `cd apps/mobile && npx expo-doctor` (non-blocking — report any unrelated pre-existing warnings, do not attempt to fix them in this task)

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/package.json apps/mobile/package-lock.json
git commit -m "chore(mobile): add react-native-webview for in-app invoice preview

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

(Adjust the lockfile filename in the `git add` to whatever `ls apps/mobile/*.json apps/mobile/*.yaml apps/mobile/*.lock 2>/dev/null` shows before committing — do not blindly add a lockfile that doesn't exist, and do not use `git add -A` given the 207 unrelated dirty files on this branch.)

---

## Task 6: `InvoicePreviewScreen` + route

**Files:**
- Create: `apps/mobile/src/features/customer/orders/InvoicePreviewScreen.tsx`
- Create: `apps/mobile/app/customer/invoice-preview.tsx`
- Modify: `apps/mobile/app/customer/_layout.tsx` (hide the floating nav bar on this route, same treatment as `tracking`)
- Test: `apps/mobile/src/features/customer/orders/InvoicePreviewScreen.test.tsx`

**Interfaces:**
- Consumes: `createCustomerHttpAdapter()` (Task 4's `getInvoiceDownloadUrl`), `sessionStore.getAccessToken()`.
- Produces: `InvoicePreviewScreen({ invoiceId, onBack }: { invoiceId: string; onBack: () => void })` — a full-screen `WebView` pointed at `GET /invoices/:id/download` with a Bearer header (Cách A from the handoff — the WebView's native networking follows the 302 itself, no JSON parsing involved), plus an "Mở trong trình duyệt" fallback button that resolves the signed URL via `getInvoiceDownloadUrl` and opens it with `Linking.openURL`.

- [ ] **Step 1: Write the failing test**

```tsx
// apps/mobile/src/features/customer/orders/InvoicePreviewScreen.test.tsx
import { describe, expect, it, jest } from '@jest/globals';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { Linking } from 'react-native';

jest.mock('react-native-webview', () => {
  const { View } = require('react-native');
  return { WebView: (props: any) => <View testID="invoice-webview" {...props} /> };
});

import { InvoicePreviewScreen } from './InvoicePreviewScreen';

describe('InvoicePreviewScreen', () => {
  it('renders a WebView pointed at the download endpoint with an Authorization header', () => {
    render(<InvoicePreviewScreen invoiceId="invoice-1" onBack={jest.fn()} />);

    const webview = screen.getByTestId('invoice-webview');
    expect(webview.props.source.uri).toContain('/invoices/invoice-1/download');
  });

  it('opens the resolved signed URL in the external browser via the fallback button', async () => {
    const openURLSpy = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
    const resolveUrl = jest.fn(async () => 'https://signed.example/invoice-1.pdf');

    render(
      <InvoicePreviewScreen invoiceId="invoice-1" onBack={jest.fn()} resolveDownloadUrl={resolveUrl} />,
    );

    fireEvent.press(screen.getByRole('button', { name: 'Mở trong trình duyệt' }));

    await waitFor(() => expect(openURLSpy).toHaveBeenCalledWith('https://signed.example/invoice-1.pdf'));
    openURLSpy.mockRestore();
  });

  it('calls onBack when the back button is pressed', () => {
    const onBack = jest.fn();
    render(<InvoicePreviewScreen invoiceId="invoice-1" onBack={onBack} />);

    fireEvent.press(screen.getByRole('button', { name: 'Quay lại' }));

    expect(onBack).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/mobile && npx jest src/features/customer/orders/InvoicePreviewScreen.test.tsx`
Expected: FAIL — module not found

- [ ] **Step 3: Implement**

```tsx
// apps/mobile/src/features/customer/orders/InvoicePreviewScreen.tsx
import { useState } from 'react';
import { Linking, StyleSheet, Text, View } from 'react-native';
import { WebView } from 'react-native-webview';

import { sessionStore } from '../../../auth/session-store';
import { Button } from '../../../ui/Button';
import { ScreenScaffold } from '../../../ui/ScreenScaffold';
import { createCustomerHttpAdapter } from './adapter';

const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api/v1';

export interface InvoicePreviewScreenProps {
  readonly invoiceId: string;
  readonly onBack: () => void;
  /** Injectable for tests; defaults to the real adapter's resolver. */
  readonly resolveDownloadUrl?: (invoiceId: string) => Promise<string>;
}

export function InvoicePreviewScreen({
  invoiceId,
  onBack,
  resolveDownloadUrl,
}: InvoicePreviewScreenProps) {
  const [openError, setOpenError] = useState<string | null>(null);
  const downloadPath = `${API_BASE}/invoices/${invoiceId}/download`;
  const token = sessionStore.getAccessToken();

  const handleOpenExternally = async () => {
    setOpenError(null);
    try {
      const resolver =
        resolveDownloadUrl ?? createCustomerHttpAdapter().getInvoiceDownloadUrl;
      if (!resolver) throw new Error('resolveDownloadUrl unavailable');
      const url = await resolver(invoiceId);
      await Linking.openURL(url);
    } catch {
      setOpenError('Không thể mở hóa đơn trong trình duyệt. Vui lòng thử lại.');
    }
  };

  return (
    <ScreenScaffold title="Xem hóa đơn">
      <View style={styles.toolbar}>
        <Button label="Quay lại" onPress={onBack} variant="secondary" />
        <Button label="Mở trong trình duyệt" onPress={() => void handleOpenExternally()} variant="secondary" />
      </View>
      {openError ? <Text style={styles.errorText}>{openError}</Text> : null}
      <WebView
        source={{
          uri: downloadPath,
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        }}
        style={styles.webview}
      />
    </ScreenScaffold>
  );
}

const styles = StyleSheet.create({
  toolbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  errorText: {
    color: '#B91C1C',
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  webview: {
    flex: 1,
  },
});
```

```tsx
// apps/mobile/app/customer/invoice-preview.tsx
import { useLocalSearchParams, useRouter } from 'expo-router';

import { InvoicePreviewScreen } from '../../src/features/customer/orders/InvoicePreviewScreen';
import { ScreenScaffold } from '../../src/ui/ScreenScaffold';
import { ScreenState } from '../../src/ui/ScreenState';

export default function InvoicePreviewPage() {
  const { invoiceId } = useLocalSearchParams<{ invoiceId?: string }>();
  const router = useRouter();

  if (!invoiceId || Array.isArray(invoiceId)) {
    return (
      <ScreenScaffold title="Xem hóa đơn">
        <ScreenState
          message="Liên kết hóa đơn không đúng định dạng."
          state="error"
          title="Không tìm thấy hóa đơn"
        />
      </ScreenScaffold>
    );
  }

  return <InvoicePreviewScreen invoiceId={invoiceId} onBack={() => router.back()} />;
}
```

In `apps/mobile/app/customer/_layout.tsx`, extend the existing `isSubScreenWithoutNav` check (around line 79-83) to also hide the floating nav on this full-screen preview:

```typescript
  const isSubScreenWithoutNav =
    pathname.includes('/customer/chat') ||
    pathname.includes('/customer/report') ||
    pathname.includes('/customer/review') ||
    pathname.includes('/customer/tracking') ||
    pathname.includes('/customer/invoice-preview');
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/mobile && npx jest src/features/customer/orders/InvoicePreviewScreen.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/src/features/customer/orders/InvoicePreviewScreen.tsx apps/mobile/src/features/customer/orders/InvoicePreviewScreen.test.tsx apps/mobile/app/customer/invoice-preview.tsx apps/mobile/app/customer/_layout.tsx
git commit -m "feat(mobile): add in-app invoice PDF preview screen via WebView

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 7: Wire `onOpenInvoice` to navigate with `invoiceId`

**Files:**
- Modify: `apps/mobile/src/features/customer/orders/CustomerOrderDetailScreen.tsx`
- Modify: `apps/mobile/src/features/customer/orders/CustomerOrderDetailRuntime.tsx`
- Modify: `apps/mobile/src/features/customer/orders/CustomerScreens.test.tsx`

**Interfaces:**
- Changes `onOpenInvoice?: (viewUrl: string) => void` → `onOpenInvoice?: (invoiceId: string) => void` on `CustomerOrderDetailScreenProps` and the internal `CustomerDetailContent`/`InvoiceSection` prop types (`CustomerOrderDetailScreen.tsx:47,59,370`).
- `CustomerOrderDetailRuntime`'s `handleOpenInvoice` navigates to `/customer/invoice-preview` instead of calling `Linking.openURL`.

- [ ] **Step 1: Update the existing test's expectation first (RED)**

In `apps/mobile/src/features/customer/orders/CustomerScreens.test.tsx`, change the assertion at line 675:

```diff
-    expect(onOpenInvoice).toHaveBeenCalledWith(invoice.viewUrl);
+    expect(onOpenInvoice).toHaveBeenCalledWith(invoice.id);
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/mobile && npx jest src/features/customer/orders/CustomerScreens.test.tsx -t "opens the view link"`
Expected: FAIL — `onOpenInvoice` was still called with `invoice.viewUrl` (the old `onPress={() => onOpenInvoice?.(invoice.viewUrl)}` at line 103).

- [ ] **Step 3: Implement**

In `apps/mobile/src/features/customer/orders/CustomerOrderDetailScreen.tsx`, change all four `onOpenInvoice?: (viewUrl: string) => void` type declarations (lines 47, 59, 370) to `onOpenInvoice?: (invoiceId: string) => void`, and change the call site (line 103):

```diff
-        onPress={() => onOpenInvoice?.(invoice.viewUrl)}
+        onPress={() => onOpenInvoice?.(invoice.id)}
```

In `apps/mobile/src/features/customer/orders/CustomerOrderDetailRuntime.tsx`, replace `handleOpenInvoice` (lines 115-117) and the `onOpenInvoice` wiring (line 145):

```diff
-  async function handleOpenInvoice(viewUrl: string) {
-    await Linking.openURL(viewUrl).catch(() => {});
-  }
+  function handleOpenInvoice(invoiceId: string) {
+    router.push({ pathname: '/customer/invoice-preview', params: { invoiceId } });
+  }
```

```diff
-      onOpenInvoice={(url) => void handleOpenInvoice(url)}
+      onOpenInvoice={(invoiceId) => handleOpenInvoice(invoiceId)}
```

Remove the now-unused `Linking` import from `CustomerOrderDetailRuntime.tsx` (line 3) if nothing else in the file uses it — check with `grep -n "Linking" apps/mobile/src/features/customer/orders/CustomerOrderDetailRuntime.tsx` before removing.

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd apps/mobile && npx jest src/features/customer/orders/CustomerScreens.test.tsx`
Expected: PASS — full file, not just the one test, to catch any other assertion still referencing `viewUrl` in this invoice flow.

- [ ] **Step 5: Run the full mobile customer-orders test suite**

Run: `cd apps/mobile && npx jest src/features/customer/orders`
Expected: PASS. If `CustomerOrderDetailRuntime` has no direct test file covering `handleOpenInvoice`'s navigation (per the handoff, it currently has `⚠️ no covering tests found`), this is acceptable — the behavior is exercised transitively through `CustomerScreens.test.tsx`'s screen-level test, and adding a full runtime-level router-mock test is optional polish, not required by this plan.

- [ ] **Step 6: Commit**

```bash
git add apps/mobile/src/features/customer/orders/CustomerOrderDetailScreen.tsx apps/mobile/src/features/customer/orders/CustomerOrderDetailRuntime.tsx apps/mobile/src/features/customer/orders/CustomerScreens.test.tsx
git commit -m "fix(mobile): open invoice via in-app preview instead of a stale viewUrl

onOpenInvoice now passes invoiceId so the preview screen can call
GET /invoices/:id/download at open time instead of reusing a URL that
may already be past its 3600s TTL.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 8: Full regression pass

**Files:** none (verification only)

- [ ] **Step 1: Run the full API invoice/pdf/openapi suites**

Run: `cd apps/api && npx jest src/invoices src/pdf test/openapi-contract.spec.ts`
Expected: PASS. `openapi-contract.spec.ts` should be unaffected since no response shape changed in this plan (only the PDF's internal rendering and a static seller constant were touched).

- [ ] **Step 2: Run the full mobile customer suite**

Run: `cd apps/mobile && npx jest src/features/customer`
Expected: PASS.

- [ ] **Step 3: Type-check both apps**

Run: `cd apps/api && npx tsc --noEmit` and `cd apps/mobile && npx tsc --noEmit`
Expected: no new errors. If `tsc` reports pre-existing errors unrelated to files touched in this plan (likely, given the 207 dirty files on this branch), confirm via `git stash` + rerun that they predate this work before treating them as this plan's responsibility.

- [ ] **Step 4: Confirm no unrelated files got staged**

Run: `git status --short`
Expected: only the files listed in Tasks 1-7's commits show as committed; everything else on the branch remains exactly as dirty/untouched as it was at the start of this plan (verify against the `git status` snapshot taken before Task 1).

- [ ] **Step 5: Manual Android WebView check (cannot be automated in this plan)**

Per the handoff: iOS (WKWebView) renders PDFs reliably; Android's System WebView PDF rendering is device/version-dependent. This step requires a human or a separate device-testing pass — record the outcome in the PR description rather than silently assuming it works. If Android fails to render inline, the existing "Mở trong trình duyệt" fallback button (Task 6) is the documented mitigation — do not attempt a Google-Docs-Viewer workaround unless `STORAGE_PROVIDER=s3` is confirmed in the target environment (it does not work with local storage's `http://localhost` URLs).

---

## Self-Review Notes

- **Spec coverage:** Task 1 (constants/seller), Task 3 (header/seller/buyer/table/totals-in-words/signature) covers Task 1 of the handoff. Task 2 (email content) is explicitly optional in the handoff and intentionally has no task here — not a gap. Tasks 4-7 cover Task 3 of the handoff (WebView Cách A + `invoiceId`-based `onOpenInvoice` + fallback via Cách B only for the external-open button, exactly as the handoff's risk analysis recommends). The handoff's "related, not required" `InvoiceSection` visual/bug-fix work (optimistic `sent` state) is deliberately left out of this plan's Global Constraints scope — flag it as a follow-up if time remains after Task 8.
- **Placeholder scan:** no TBD/"add error handling"/"similar to Task N" — every step has literal code.
- **Type consistency:** `getInvoiceDownloadUrl(invoiceId: string): Promise<string>` is defined once in Task 4 and referenced identically in Task 6's `InvoicePreviewScreen` and its test. `onOpenInvoice(invoiceId: string): void` is defined once in Task 7 and matches Task 6's route param name (`invoiceId`) used in `router.push`.
