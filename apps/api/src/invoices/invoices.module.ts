import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { DatabaseModule } from '../database/database.module.js';
import { MediaModule } from '../media/media.module.js';
import { OrdersModule } from '../orders/orders.module.js';
import { PdfModule } from '../pdf/pdf.module.js';
import { PdfService } from '../pdf/pdf.service.js';
import { InvoiceIssuancePort } from './invoice-issuance.port.js';
import { EInvoiceProvider, InvoiceProvider, SelfGeneratedInvoiceProvider } from './invoice.provider.js';
import { InvoicesController } from './invoices.controller.js';
import { InvoicesRepository } from './invoices.repository.js';
import { InvoicesService } from './invoices.service.js';
import { ConsoleMailProvider, MailProvider, SmtpMailProvider } from './mail.provider.js';

function buildMailProvider(source: NodeJS.ProcessEnv): MailProvider {
  const provider = (source.MAIL_PROVIDER ?? 'console').toLowerCase();
  if (provider === 'smtp') {
    return new SmtpMailProvider({
      host: source.SMTP_HOST ?? '',
      port: Number(source.SMTP_PORT ?? '587'),
      secure: (source.SMTP_SECURE ?? 'false').toLowerCase() === 'true',
      user: source.SMTP_USER ?? '',
      pass: source.SMTP_PASS ?? '',
      from: source.MAIL_FROM ?? '',
    });
  }
  return new ConsoleMailProvider();
}

function buildInvoiceProvider(source: NodeJS.ProcessEnv, pdf: PdfService): InvoiceProvider {
  const provider = (source.INVOICE_PROVIDER ?? 'self').toLowerCase();
  if (provider === 'einvoice') {
    return new EInvoiceProvider();
  }
  return new SelfGeneratedInvoiceProvider(pdf);
}

/**
 * Only `InvoicesService` and `InvoiceIssuancePort` (bound to the same
 * instance via `useExisting`) are exported — `PaymentsModule` depends on the
 * narrow port, never on the controller or repository.
 */
@Module({
  imports: [AuthModule, DatabaseModule, OrdersModule, MediaModule, PdfModule],
  controllers: [InvoicesController],
  providers: [
    InvoicesRepository,
    InvoicesService,
    { provide: InvoiceIssuancePort, useExisting: InvoicesService },
    {
      provide: InvoiceProvider,
      useFactory: (pdf: PdfService): InvoiceProvider => buildInvoiceProvider(process.env, pdf),
      inject: [PdfService],
    },
    {
      provide: MailProvider,
      useFactory: (): MailProvider => buildMailProvider(process.env),
    },
  ],
  exports: [InvoicesService, InvoiceIssuancePort],
})
export class InvoicesModule {}
