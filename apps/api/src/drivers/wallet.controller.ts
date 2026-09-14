import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseFilters,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser, type AuthenticatedActor } from '../auth/decorators/current-user.js';
import { RequireRoles } from '../auth/decorators/require-roles.js';
import { AccessTokenGuard } from '../auth/guards/access-token.guard.js';
import { RoleGuard } from '../auth/guards/role.guard.js';
import { ApiExceptionFilter } from '../common/api-exception.filter.js';
import { RequestPayoutDto, RejectPayoutDto } from './dto/request-payout.dto.js';
import { WalletService } from './wallet.service.js';

@Controller()
@UseFilters(ApiExceptionFilter)
@UseGuards(AccessTokenGuard, RoleGuard)
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  @Get('driver/wallet')
  @RequireRoles('DRIVER')
  getWallet(@CurrentUser() actor: AuthenticatedActor) {
    return this.walletService.getWallet(actor);
  }

  @Post('driver/payout')
  @RequireRoles('DRIVER')
  @HttpCode(HttpStatus.CREATED)
  requestPayout(
    @CurrentUser() actor: AuthenticatedActor,
    @Body() dto: RequestPayoutDto,
  ) {
    return this.walletService.requestPayout(actor, dto.amountVnd, dto.clientRequestId);
  }

  @Post('admin/payouts/:id/approve')
  @RequireRoles('ADMIN')
  @HttpCode(HttpStatus.OK)
  approvePayout(
    @CurrentUser() actor: AuthenticatedActor,
    @Param('id') id: string,
  ) {
    return this.walletService.approvePayout(actor, id);
  }

  @Post('admin/payouts/:id/reject')
  @RequireRoles('ADMIN')
  @HttpCode(HttpStatus.OK)
  rejectPayout(
    @CurrentUser() actor: AuthenticatedActor,
    @Param('id') id: string,
    @Body() dto: RejectPayoutDto,
  ) {
    return this.walletService.rejectPayout(actor, id, dto?.reason);
  }
}
