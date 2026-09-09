import { Body, Controller, Get, Param, Post, Res, UseFilters, UseGuards } from '@nestjs/common';

import { AccessTokenGuard } from '../auth/guards/access-token.guard.js';
import { RoleGuard } from '../auth/guards/role.guard.js';
import { CurrentUser, type AuthenticatedActor } from '../auth/decorators/current-user.js';
import { ApiExceptionFilter } from '../common/api-exception.filter.js';
import { SendInvoiceDto } from './dto/send-invoice.dto.js';
import { InvoicesService, type InvoiceView } from './invoices.service.js';

/**
 * Minimal response contract for redirecting to the signed PDF URL —
 * satisfied by both Express and Fastify (mirrors `PdfHttpResponse` in
 * `drivers.controller.ts`).
 */
interface RedirectHttpResponse {
  redirect(url: string): void;
}

@Controller('invoices')
@UseFilters(ApiExceptionFilter)
@UseGuards(AccessTokenGuard, RoleGuard)
export class InvoicesController {
  constructor(private readonly invoicesService: InvoicesService) {}

  @Get('order/:orderId')
  async getForOrder(
    @CurrentUser() actor: AuthenticatedActor,
    @Param('orderId') orderId: string,
  ): Promise<InvoiceView> {
    return this.invoicesService.getForOrder(actor, orderId);
  }

  @Get(':id/download')
  async download(
    @CurrentUser() actor: AuthenticatedActor,
    @Param('id') id: string,
    @Res() res: RedirectHttpResponse,
  ): Promise<void> {
    const url = await this.invoicesService.getDownloadUrl(actor, id);
    res.redirect(url);
  }

  @Post(':id/send')
  async send(
    @CurrentUser() actor: AuthenticatedActor,
    @Param('id') id: string,
    @Body() body: SendInvoiceDto,
  ): Promise<InvoiceView> {
    return this.invoicesService.sendEmail(actor, id, body.email);
  }
}
