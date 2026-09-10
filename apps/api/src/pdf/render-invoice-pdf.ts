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
interface InvoiceTableColumn {
  readonly label: string;
  readonly width: number;
  readonly align: 'left' | 'center' | 'right';
}

const TABLE_COLUMNS: readonly InvoiceTableColumn[] = [
  { label: 'STT', width: 28, align: 'center' },
  { label: 'Tên hàng hóa, dịch vụ', width: 175, align: 'left' },
  { label: 'ĐVT', width: 45, align: 'center' },
  { label: 'SL', width: 30, align: 'center' },
  { label: 'Đơn giá', width: 90, align: 'right' },
  {
    label: 'Thành tiền',
    width: CONTENT_WIDTH_PT - (28 + 175 + 45 + 30 + 90),
    align: 'right',
  },
];
const TABLE_ROW_HEIGHT_PT = 20;

function columnX(index: number): number {
  let x = PAGE_MARGIN_PT;
  for (let i = 0; i < index; i++) {
    x += TABLE_COLUMNS[i]?.width ?? 0;
  }
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
    if (!column) return;
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
