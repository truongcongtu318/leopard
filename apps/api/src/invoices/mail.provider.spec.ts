import { Logger } from '@nestjs/common';
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';

import { ConsoleMailProvider, SmtpMailProvider } from './mail.provider.js';

const SECRET_EMAIL = 'khach-hang-bi-mat@example.com';
const SECRET_LINK = 'https://storage.example/signed-url-that-must-never-be-logged';

describe('ConsoleMailProvider', () => {
  let logSpy: jest.SpiedFunction<typeof Logger.prototype.log>;

  beforeEach(() => {
    logSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
  });

  afterEach(() => {
    logSpy.mockRestore();
  });

  it('resolves without throwing and without ever transmitting the link', async () => {
    const provider = new ConsoleMailProvider();

    await expect(
      provider.sendInvoiceLink({
        to: SECRET_EMAIL,
        customerName: 'Nguyễn Văn A',
        invoiceNumber: 'LP/2026/000001',
        link: SECRET_LINK,
      }),
    ).resolves.toBeUndefined();
  });

  it('never logs the recipient email or the signed link', async () => {
    const provider = new ConsoleMailProvider();

    await provider.sendInvoiceLink({
      to: SECRET_EMAIL,
      customerName: 'Nguyễn Văn A',
      invoiceNumber: 'LP/2026/000001',
      link: SECRET_LINK,
    });

    const loggedText = logSpy.mock.calls.map((call) => String(call[0])).join('\n');
    expect(loggedText).not.toContain(SECRET_EMAIL);
    expect(loggedText).not.toContain(SECRET_LINK);
    expect(loggedText).toContain('LP/2026/000001');
  });
});

describe('SmtpMailProvider', () => {
  const config = {
    host: 'smtp.example.com',
    port: 587,
    secure: false,
    user: 'user',
    pass: 'pass',
    from: 'invoices@leopard.vn',
  };

  function createFakeTransporter() {
    return { sendMail: jest.fn(async () => undefined) };
  }

  it('sends exactly one email containing the invoice number and link', async () => {
    const transporter = createFakeTransporter();
    const provider = new SmtpMailProvider(config, transporter);

    await provider.sendInvoiceLink({
      to: SECRET_EMAIL,
      customerName: 'Nguyễn Văn A',
      invoiceNumber: 'LP/2026/000001',
      link: SECRET_LINK,
    });

    expect(transporter.sendMail).toHaveBeenCalledTimes(1);
    const sent = transporter.sendMail.mock.calls[0]?.[0] as Record<string, string>;
    expect(sent.from).toBe(config.from);
    expect(sent.to).toBe(SECRET_EMAIL);
    expect(sent.subject).toContain('LP/2026/000001');
    expect(sent.text).toContain(SECRET_LINK);
  });

  it('propagates a transporter rejection to the caller', async () => {
    const transporter = createFakeTransporter();
    transporter.sendMail.mockRejectedValueOnce(new Error('smtp down'));
    const provider = new SmtpMailProvider(config, transporter);

    await expect(
      provider.sendInvoiceLink({
        to: SECRET_EMAIL,
        customerName: 'Nguyễn Văn A',
        invoiceNumber: 'LP/2026/000001',
        link: SECRET_LINK,
      }),
    ).rejects.toThrow('smtp down');
  });
});
