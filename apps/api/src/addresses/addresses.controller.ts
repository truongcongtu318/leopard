import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseFilters,
  UseGuards,
} from '@nestjs/common';
import type { CustomerAddress } from '@prisma/client';
import { CurrentUser, type AuthenticatedActor } from '../auth/decorators/current-user.js';
import { RequireRoles } from '../auth/decorators/require-roles.js';
import { AccessTokenGuard } from '../auth/guards/access-token.guard.js';
import { RoleGuard } from '../auth/guards/role.guard.js';
import { ApiExceptionFilter } from '../common/api-exception.filter.js';
import { AddressesService } from './addresses.service.js';
import { CreateAddressDto } from './dto/create-address.dto.js';

@Controller('users/me/addresses')
@UseFilters(ApiExceptionFilter)
@UseGuards(AccessTokenGuard, RoleGuard)
@RequireRoles('CUSTOMER')
export class AddressesController {
  constructor(private readonly addressesService: AddressesService) {}

  @Get()
  listAddresses(@CurrentUser() actor: AuthenticatedActor): Promise<CustomerAddress[]> {
    return this.addressesService.listAddresses(actor.userId);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  createAddress(
    @CurrentUser() actor: AuthenticatedActor,
    @Body() dto: CreateAddressDto,
  ): Promise<CustomerAddress> {
    return this.addressesService.createAddress(actor.userId, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  deleteAddress(
    @CurrentUser() actor: AuthenticatedActor,
    @Param('id') id: string,
  ): Promise<{ success: true }> {
    return this.addressesService.deleteAddress(actor.userId, id);
  }

  @Patch(':id/default')
  setDefault(
    @CurrentUser() actor: AuthenticatedActor,
    @Param('id') id: string,
  ): Promise<CustomerAddress> {
    return this.addressesService.setDefault(actor.userId, id);
  }
}
