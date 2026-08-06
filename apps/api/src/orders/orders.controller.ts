import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UseFilters,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser, type AuthenticatedActor } from '../auth/decorators/current-user.js';
import { RequireRoles } from '../auth/decorators/require-roles.js';
import { AccessTokenGuard } from '../auth/guards/access-token.guard.js';
import { RoleGuard } from '../auth/guards/role.guard.js';
import { ApiExceptionFilter } from '../common/api-exception.filter.js';
import type { CreateOrderDto } from './dto/create-order.dto.js';
import type { MappedOrderResponse } from './order-response.mapper.js';
import { OrdersService } from './orders.service.js';

@Controller('orders')
@UseFilters(ApiExceptionFilter)
@UseGuards(AccessTokenGuard, RoleGuard)
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @RequireRoles('CUSTOMER')
  @HttpCode(HttpStatus.CREATED)
  createOrder(
    @CurrentUser() actor: AuthenticatedActor,
    @Body() dto: CreateOrderDto,
  ): Promise<MappedOrderResponse> {
    return this.ordersService.createOrder(actor, dto);
  }

  @Get()
  @RequireRoles('CUSTOMER')
  getCustomerOrders(
    @CurrentUser() actor: AuthenticatedActor,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    const pageNum = page ? Math.max(1, parseInt(page, 10) || 1) : 1;
    const limitNum = pageSize ? Math.max(1, Math.min(100, parseInt(pageSize, 10) || 20)) : 20;

    return this.ordersService.getCustomerOrders(actor, pageNum, limitNum);
  }

  @Get(':id')
  getOrderById(
    @CurrentUser() actor: AuthenticatedActor,
    @Param('id') id: string,
  ): Promise<MappedOrderResponse> {
    return this.ordersService.getOrderById(actor, id);
  }
}
