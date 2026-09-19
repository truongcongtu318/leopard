import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  UseFilters,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { CustomerWalletService } from './customer-wallet.service.js';
import { AccessTokenGuard } from '../auth/guards/access-token.guard.js';
import { RoleGuard } from '../auth/guards/role.guard.js';
import { RequireRoles } from '../auth/decorators/require-roles.js';
import { CurrentUser, type AuthenticatedActor } from '../auth/decorators/current-user.js';
import { ApiExceptionFilter } from '../common/api-exception.filter.js';
import { RequestCustomerWithdrawalDto } from './dto/customer-withdrawal.dto.js';

@Controller('customer/wallet')
@UseFilters(ApiExceptionFilter)
@UseGuards(AccessTokenGuard, RoleGuard)
export class CustomerWalletController {
  constructor(private readonly walletService: CustomerWalletService) {}

  @Get()
  @RequireRoles('CUSTOMER', 'ADMIN')
  async getWallet(@CurrentUser() actor: AuthenticatedActor) {
    return this.walletService.getWalletSummary(actor.userId);
  }

  @Post('withdrawals')
  @RequireRoles('CUSTOMER')
  @HttpCode(HttpStatus.CREATED)
  async requestWithdrawal(
    @CurrentUser() actor: AuthenticatedActor,
    @Body() dto: RequestCustomerWithdrawalDto,
  ) {
    return this.walletService.requestWithdrawal(actor, dto);
  }
}
