/**
 * Structured, storage/HTTP-agnostic input for PdfService. Every field is a
 * plain value already resolved by the caller (no DB rows, no I/O handles) so
 * rendering stays pure and deterministic.
 */

export interface PdfLabeledField {
  readonly label: string;
  readonly value: string;
}

export interface PdfSection {
  readonly heading: string;
  readonly paragraphs: readonly string[];
}

export interface PdfSignature {
  readonly signedByName: string;
  readonly signedAt: Date;
  /** Raw image bytes (PNG/JPEG/WebP). Omit to render the typed name only. */
  readonly signatureImage?: Buffer;
}

export interface ContractPdfInput {
  readonly documentTitle: string;
  readonly version: string;
  readonly generatedAt: Date;
  readonly partyFields: readonly PdfLabeledField[];
  readonly sections: readonly PdfSection[];
  /** Omitted for the unsigned template PDF (e.g. GET /driver/contract). */
  readonly signature?: PdfSignature;
}

export interface InvoicePdfLineItem {
  readonly label: string;
  readonly amountVnd: number;
}

export interface InvoicePdfInput {
  readonly invoiceNumber: string;
  readonly issuedAt: Date;
  readonly customerName: string;
  readonly customerEmail?: string;
  readonly customerTaxCode?: string;
  readonly customerAddress?: string;
  readonly orderReference: string;
  readonly lineItems: readonly InvoicePdfLineItem[];
  readonly amountVnd: number;
  readonly vatRateVnd: number;
  readonly totalVnd: number;
}
