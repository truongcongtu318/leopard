import { Module } from '@nestjs/common';
import { PdfService } from './pdf.service.js';

/**
 * Focused, storage/HTTP-agnostic PDF rendering module. Only PdfService is
 * exported so consumers (drivers, and later invoices) reuse the rendering
 * engine without pulling in driver-domain services.
 */
@Module({
  providers: [PdfService],
  exports: [PdfService],
})
export class PdfModule {}
