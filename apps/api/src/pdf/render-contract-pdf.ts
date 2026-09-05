import PDFDocument from 'pdfkit';
import { PDF_FONT_BOLD_PATH, PDF_FONT_REGULAR_PATH } from './fonts.js';
import type { ContractPdfInput, PdfLabeledField, PdfSection, PdfSignature } from './pdf.types.js';

const PAGE_MARGIN_PT = 56;
const FONT_BODY = 'Body';
const FONT_HEADING = 'Heading';
const SIGNATURE_IMAGE_MAX_WIDTH_PT = 180;
const SIGNATURE_IMAGE_MAX_HEIGHT_PT = 80;

// Fixed, locale-explicit date formatting so the same input always renders
// identical bytes regardless of the host machine's default locale/timezone.
const CONTRACT_DATE_FORMATTER = new Intl.DateTimeFormat('vi-VN', {
  timeZone: 'Asia/Ho_Chi_Minh',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
});

function formatContractDate(date: Date): string {
  return CONTRACT_DATE_FORMATTER.format(date);
}

function renderHeader(doc: PDFKit.PDFDocument, input: ContractPdfInput): void {
  doc.font(FONT_HEADING).fontSize(16).text(input.documentTitle, { align: 'center' });
  doc.moveDown(0.5);
  doc.font(FONT_BODY).fontSize(10);
  doc.text(`Phiên bản: ${input.version}`, { align: 'center' });
  doc.text(`Ngày tạo: ${formatContractDate(input.generatedAt)}`, { align: 'center' });
  doc.moveDown(1);
}

function renderPartyFields(doc: PDFKit.PDFDocument, fields: readonly PdfLabeledField[]): void {
  doc.font(FONT_HEADING).fontSize(12).text('Thông tin các bên');
  doc.moveDown(0.25);
  doc.font(FONT_BODY).fontSize(11);
  for (const field of fields) {
    doc.text(`${field.label}: ${field.value}`);
  }
  doc.moveDown(0.75);
}

function renderSections(doc: PDFKit.PDFDocument, sections: readonly PdfSection[]): void {
  for (const section of sections) {
    doc.font(FONT_HEADING).fontSize(12).text(section.heading);
    doc.moveDown(0.25);
    doc.font(FONT_BODY).fontSize(11);
    for (const paragraph of section.paragraphs) {
      doc.text(paragraph, { align: 'justify' });
      doc.moveDown(0.4);
    }
    doc.moveDown(0.35);
  }
}

function renderSignature(doc: PDFKit.PDFDocument, signature: PdfSignature): void {
  doc.moveDown(0.5);
  doc.font(FONT_HEADING).fontSize(12).text('Chữ ký người lái xe');
  doc.moveDown(0.25);
  doc.font(FONT_BODY).fontSize(11);
  doc.text(`Họ tên: ${signature.signedByName}`);
  doc.text(`Thời điểm ký: ${formatContractDate(signature.signedAt)}`);
  doc.moveDown(0.5);

  if (signature.signatureImage) {
    doc.image(signature.signatureImage, {
      fit: [SIGNATURE_IMAGE_MAX_WIDTH_PT, SIGNATURE_IMAGE_MAX_HEIGHT_PT],
    });
    return;
  }

  doc.font(FONT_HEADING).fontSize(14).text(signature.signedByName);
  doc.font(FONT_BODY).fontSize(9).text('(Chữ ký dạng văn bản do tài xế nhập)');
}

/**
 * Contract-oriented render function: turns structured contract fields into a
 * finished PDF `Buffer`. Pure — no HTTP calls, no DB reads. Deterministic
 * page margins and a fixed date formatter keep repeated renders of the same
 * input byte-for-byte stable except for pdfkit's own internal object IDs.
 */
export function renderContractPdf(input: ContractPdfInput): Promise<Buffer> {
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
        Title: input.documentTitle,
        Author: 'Leopard',
        CreationDate: input.generatedAt,
      },
    });

    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', (error: Error) => reject(error));

    doc.registerFont(FONT_BODY, PDF_FONT_REGULAR_PATH);
    doc.registerFont(FONT_HEADING, PDF_FONT_BOLD_PATH);

    renderHeader(doc, input);
    renderPartyFields(doc, input.partyFields);
    renderSections(doc, input.sections);
    if (input.signature) {
      renderSignature(doc, input.signature);
    }

    doc.end();
  });
}
