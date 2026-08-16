import { Controller, Post, Get, Param, UploadedFile, UseInterceptors, UseGuards, UseFilters, Body } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { MediaService } from './media.service.js';
import { AccessTokenGuard } from '../auth/guards/access-token.guard.js';
import { RoleGuard } from '../auth/guards/role.guard.js';
import { RequireRoles } from '../auth/decorators/require-roles.js';
import { CurrentUser, type AuthenticatedActor } from '../auth/decorators/current-user.js';
import { ApiExceptionFilter } from '../common/api-exception.filter.js';
import { DomainError } from '../common/domain-error.js';

@Controller()
@UseGuards(AccessTokenGuard, RoleGuard)
@UseFilters(ApiExceptionFilter)
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @Post('orders/:id/media/cargo')
  @RequireRoles('CUSTOMER')
  @UseInterceptors(FileInterceptor('file'))
  async uploadCargoMedia(
    @CurrentUser() actor: AuthenticatedActor,
    @Param('id') orderId: string,
    @UploadedFile() file: { buffer: Buffer; mimetype: string; size: number } | undefined,
    @Body('clientRequestId') clientRequestId: string,
  ) {
    if (!file) {
      throw new DomainError('VALIDATION_ERROR', 422, 'File là bắt buộc');
    }
    if (!clientRequestId) {
      throw new DomainError('VALIDATION_ERROR', 422, 'clientRequestId là bắt buộc');
    }
    return this.mediaService.uploadMedia(actor, orderId, 'CARGO', file.buffer, clientRequestId);
  }

  @Post('orders/:id/media/delivery-proof')
  @RequireRoles('DRIVER')
  @UseInterceptors(FileInterceptor('file'))
  async uploadDeliveryProof(
    @CurrentUser() actor: AuthenticatedActor,
    @Param('id') orderId: string,
    @UploadedFile() file: { buffer: Buffer; mimetype: string; size: number } | undefined,
    @Body('clientRequestId') clientRequestId: string,
  ) {
    if (!file) {
      throw new DomainError('VALIDATION_ERROR', 422, 'File là bắt buộc');
    }
    if (!clientRequestId) {
      throw new DomainError('VALIDATION_ERROR', 422, 'clientRequestId là bắt buộc');
    }
    return this.mediaService.uploadMedia(actor, orderId, 'DELIVERY_PROOF', file.buffer, clientRequestId);
  }

  @Get('media/:id/url')
  async getMediaUrl(
    @CurrentUser() actor: AuthenticatedActor,
    @Param('id') mediaId: string,
  ) {
    return this.mediaService.getSignedUrl(actor, mediaId);
  }
}
