import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Res,
  UploadedFile,
  UseFilters,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { DriverDocumentType } from '@prisma/client';
import { CONTRACT_VERSION } from './driver-contract-template.js';
import { DriverContractService } from './driver-contract.service.js';
import { AllowUserStatuses } from '../auth/decorators/allow-user-statuses.js';
import { CurrentUser, type AuthenticatedActor } from '../auth/decorators/current-user.js';
import { RequireRoles } from '../auth/decorators/require-roles.js';
import { AccessTokenGuard } from '../auth/guards/access-token.guard.js';
import { RoleGuard } from '../auth/guards/role.guard.js';
import { ApiExceptionFilter } from '../common/api-exception.filter.js';
import { DomainError } from '../common/domain-error.js';
import { AcceptOrderService } from '../orders/accept-order.service.js';
import { UpdateOrderStatusService } from '../orders/update-order-status.service.js';
import { UpdateOrderStatusDto } from '../orders/dto/update-order-status.dto.js';
import { DriversService } from './drivers.service.js';
import { DriverApplicationService } from './driver-application.service.js';
import { DriverDocumentService } from './driver-document.service.js';
import { ApplyDriverDto } from './dto/apply-driver.dto.js';
import { UpdateAvailabilityDto } from './dto/update-availability.dto.js';

const DRIVER_DOCUMENT_TYPES: readonly DriverDocumentType[] = [
  'LICENSE',
  'VEHICLE_REGISTRATION',
  'ID_CARD',
  'VEHICLE_PHOTO',
];

/**
 * Minimal response contract for streaming the contract PDF — satisfied by
 * both Express and Fastify, avoiding a direct `express` type dependency
 * (mirrors `HttpServerResponse` in `api-exception.filter.ts`).
 */
interface PdfHttpResponse {
  setHeader(name: string, value: string): this;
  status(code: number): this;
  send(body: Buffer): void;
}

@Controller('driver')
@UseFilters(ApiExceptionFilter)
@UseGuards(AccessTokenGuard, RoleGuard)
export class DriversController {
  constructor(
    private readonly driversService: DriversService,
    private readonly driverApplicationService: DriverApplicationService,
    private readonly driverDocumentService: DriverDocumentService,
    private readonly driverContractService: DriverContractService,
    private readonly acceptOrderService: AcceptOrderService,
    private readonly updateOrderStatusService: UpdateOrderStatusService,
  ) {}

  // Onboarding — no @RequireRoles: a CUSTOMER (or previously rejected driver)
  // may submit an application; it upgrades them to DRIVER / PENDING_APPROVAL.
  @Post('apply')
  @AllowUserStatuses('ACTIVE', 'PENDING_APPROVAL', 'REJECTED')
  @HttpCode(HttpStatus.CREATED)
  apply(
    @CurrentUser() actor: AuthenticatedActor,
    @Body() dto: ApplyDriverDto,
  ) {
    return this.driverApplicationService.apply(actor, dto);
  }

  @Get('application')
  @AllowUserStatuses('ACTIVE', 'PENDING_APPROVAL', 'REJECTED')
  getMyApplication(@CurrentUser() actor: AuthenticatedActor) {
    return this.driverApplicationService.getMyApplication(actor);
  }

  // Contract review, before applying: version + a link to the unsigned
  // template PDF. No DB row is created for this read-only preview.
  @Get('contract')
  @AllowUserStatuses('ACTIVE', 'PENDING_APPROVAL', 'REJECTED')
  getContract() {
    return this.driverContractService.getContractPreview();
  }

  @Get('contract/pdf')
  @AllowUserStatuses('ACTIVE', 'PENDING_APPROVAL', 'REJECTED')
  async getContractPdf(
    @Query('version') version: string | undefined,
    @Res() res: PdfHttpResponse,
  ): Promise<void> {
    const buffer = await this.driverContractService.renderUnsignedTemplatePdf(version);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `inline; filename="hop-dong-tai-xe-${CONTRACT_VERSION}.pdf"`,
    );
    res.status(HttpStatus.OK).send(buffer);
  }

  // KYC document upload (GPLX / cà-vẹt / CCCD / ảnh xe) — multipart/form-data.
  @Post('documents')
  @AllowUserStatuses('ACTIVE', 'PENDING_APPROVAL', 'REJECTED')
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(FileInterceptor('file'))
  uploadDocument(
    @CurrentUser() actor: AuthenticatedActor,
    @UploadedFile() file: { buffer: Buffer } | undefined,
    @Body('type') type: string,
    @Body('clientRequestId') clientRequestId: string,
  ) {
    if (!file) {
      throw new DomainError('VALIDATION_ERROR', 422, 'File là bắt buộc');
    }
    if (!DRIVER_DOCUMENT_TYPES.includes(type as DriverDocumentType)) {
      throw new DomainError('VALIDATION_ERROR', 422, 'Loại giấy tờ không hợp lệ');
    }
    if (!clientRequestId) {
      throw new DomainError('VALIDATION_ERROR', 422, 'clientRequestId là bắt buộc');
    }
    return this.driverDocumentService.uploadDocument(
      actor,
      type as DriverDocumentType,
      file.buffer,
      clientRequestId,
    );
  }

  @Get('documents')
  @AllowUserStatuses('ACTIVE', 'PENDING_APPROVAL', 'REJECTED')
  listMyDocuments(@CurrentUser() actor: AuthenticatedActor) {
    return this.driverDocumentService.listMyDocuments(actor);
  }

  @Patch('availability')
  @RequireRoles('DRIVER')
  @HttpCode(HttpStatus.OK)
  updateAvailability(
    @CurrentUser() actor: AuthenticatedActor,
    @Body() dto: UpdateAvailabilityDto,
  ) {
    return this.driversService.updateAvailability(actor, dto);
  }

  @Get('orders/available')
  @RequireRoles('DRIVER')
  getAvailableOrders(
    @CurrentUser() actor: AuthenticatedActor,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    const pageNum = page ? Math.max(1, parseInt(page, 10) || 1) : 1;
    const limitNum = pageSize ? Math.max(1, Math.min(100, parseInt(pageSize, 10) || 20)) : 20;

    return this.driversService.getAvailableOrders(actor, pageNum, limitNum);
  }

  @Get('orders/active')
  @RequireRoles('DRIVER')
  getActiveOrder(@CurrentUser() actor: AuthenticatedActor) {
    return this.driversService.getActiveOrder(actor);
  }

  @Post('orders/:id/accept')
  @RequireRoles('DRIVER')
  @HttpCode(HttpStatus.OK)
  acceptOrder(
    @CurrentUser() actor: AuthenticatedActor,
    @Param('id') id: string,
  ) {
    return this.acceptOrderService.acceptOrder(actor, id);
  }

  @Post('orders/:id/status')
  @RequireRoles('DRIVER')
  @HttpCode(HttpStatus.OK)
  updateStatus(
    @CurrentUser() actor: AuthenticatedActor,
    @Param('id') id: string,
    @Body() dto: UpdateOrderStatusDto,
  ) {
    return this.updateOrderStatusService.updateStatus(actor, id, dto);
  }
}
