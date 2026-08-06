import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Query,
  UseFilters,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser, type AuthenticatedActor } from '../auth/decorators/current-user.js';
import { RequireRoles } from '../auth/decorators/require-roles.js';
import { AccessTokenGuard } from '../auth/guards/access-token.guard.js';
import { RoleGuard } from '../auth/guards/role.guard.js';
import { ApiExceptionFilter } from '../common/api-exception.filter.js';
import { DriversService } from './drivers.service.js';
import type { UpdateAvailabilityDto } from './dto/update-availability.dto.js';

@Controller('driver')
@UseFilters(ApiExceptionFilter)
@UseGuards(AccessTokenGuard, RoleGuard)
export class DriversController {
  constructor(private readonly driversService: DriversService) {}

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
}
