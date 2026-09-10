import { Injectable, Logger } from '@nestjs/common';
import nodemailer from 'nodemailer';

export interface InvoiceMailInput {
  readonly to: string;
  readonly customerName: string;
  readonly invoiceNumber: string;
  readonly link: string;
}

export abstract class MailProvider {
  abstract sendInvoiceLink(input: InvoiceMailInput): Promise<void>;
}

/**
 * Development-only provider: logs that a link would be sent without ever
 * transmitting it. Never logs the recipient email or the signed link itself
 * (both are PII / access-bearing) — only the invoice number and a boolean
 * outcome, matching the plan's "no secret-bearing logs" requirement.
 */
@Injectable()
export class ConsoleMailProvider extends MailProvider {
  private readonly logger = new Logger(ConsoleMailProvider.name);

  async sendInvoiceLink(input: InvoiceMailInput): Promise<void> {
    this.logger.log(`[console-mail] Invoice link ready to send (invoice=${input.invoiceNumber})`);
  }
}

export interface SmtpMailProviderConfig {
  readonly host: string;
  readonly port: number;
  readonly secure: boolean;
  readonly user: string;
  readonly pass: string;
  readonly from: string;
}

/**
 * The slice of nodemailer's transporter this provider actually calls.
 * Depending on this narrow interface (rather than the concrete transporter
 * type) lets tests inject a fake client directly instead of mocking the
 * `nodemailer` module — mirrors `PayOsClientLike` in `payment.provider.ts`.
 */
export interface SmtpTransporterLike {
  sendMail: (input: { from: string; to: string; subject: string; text: string }) => Promise<unknown>;
}

@Injectable()
export class SmtpMailProvider extends MailProvider {
  private readonly transporter: SmtpTransporterLike;
  private readonly from: string;

  constructor(config: SmtpMailProviderConfig, client?: SmtpTransporterLike) {
    super();
    this.from = config.from;
    this.transporter =
      client ??
      nodemailer.createTransport({
        host: config.host,
        port: config.port,
        secure: config.secure,
        auth: { user: config.user, pass: config.pass },
      });
  }

  async sendInvoiceLink(input: InvoiceMailInput): Promise<void> {
    await this.transporter.sendMail({
      from: this.from,
      to: input.to,
      subject: `Hóa đơn ${input.invoiceNumber} từ Leopard`,
      text: `Chào ${input.customerName},\n\nHóa đơn ${input.invoiceNumber} của bạn đã sẵn sàng. Xem/tải tại: ${input.link}\n\nLiên kết có hiệu lực trong thời gian giới hạn.`,
    });
  }
}
