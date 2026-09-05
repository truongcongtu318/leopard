import { Injectable } from '@nestjs/common';
import { renderContractPdf } from './render-contract-pdf.js';
import type { ContractPdfInput } from './pdf.types.js';

/**
 * Thin, pure PDF rendering facade. Takes already-resolved structured input
 * and returns a finished PDF buffer — no HTTP calls, no DB reads, no storage
 * access. Callers (drivers/apply, and later invoices) resolve their own data
 * first and hand it in as plain fields.
 */
@Injectable()
export class PdfService {
  renderContract(input: ContractPdfInput): Promise<Buffer> {
    return renderContractPdf(input);
  }
}
