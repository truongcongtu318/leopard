import { Controller, Get, Patch, Param, Body, Query, UseGuards } from '@nestjs/common';
import { AdminQueryService } from './admin-query.service.js';
import { AdminCommandService } from './admin-command.service.js';
import type { AuthenticatedActor } from '../auth/decorators/current-user.js';
import { CurrentUser } from '../auth/decorators/current-user.js';
import { AccessTokenGuard } from '../auth/guards/access-token.guard.js';
import { RoleGuard } from '../auth/guards/role.guard.js';
import { RequireRoles } from '../auth/decorators/require-roles.js';
import { parsePageQuery } from '@leopard/shared';
import type {
  AdminUserQuery,
  AdminFleetQuery,
  FleetDriverQuery,
  FleetOrderQuery,
  AdminUpdateUserStatusCommand,
} from '@leopard/shared';

@UseGuards(AccessTokenGuard, RoleGuard)
@RequireRoles('ADMIN')
@Controller('admin')
export class AdminController {
  constructor(
    private readonly queryService: AdminQueryService,
    private readonly commandService: AdminCommandService,
  ) {}

  @Get('dashboard')
  async getDashboard() {
    return this.queryService.getDashboard();
  }

  @Get('users')
  async getUsers(@Query() query: any) {
    const parsedQuery: AdminUserQuery = {
      ...parsePageQuery({ page: query.page, pageSize: query.pageSize }),
      role: query.role,
      status: query.status,
      q: query.q,
    };
    return this.queryService.getUsers(parsedQuery);
  }

  @Get('fleets')
  async getFleets(@Query() query: any) {
    const parsedQuery: AdminFleetQuery = {
      ...parsePageQuery({ page: query.page, pageSize: query.pageSize }),
      q: query.q,
    };
    return this.queryService.getFleets(parsedQuery);
  }

  @Get('drivers')
  async getDrivers(@Query() query: any) {
    const parsedQuery: FleetDriverQuery = {
      ...parsePageQuery({ page: query.page, pageSize: query.pageSize }),
      status: query.status,
      q: query.q,
    };
    return this.queryService.getDrivers(parsedQuery);
  }

  @Get('orders')
  async getOrders(@Query() query: any) {
    const parsedQuery: FleetOrderQuery = {
      ...parsePageQuery({ page: query.page, pageSize: query.pageSize }),
      status: query.status,
      driverId: query.driverId,
      from: query.from,
      to: query.to,
      q: query.q,
    };
    return this.queryService.getOrders(parsedQuery);
  }

  @Patch('users/:id/status')
  async updateUserStatus(
    @CurrentUser() actor: AuthenticatedActor,
    @Param('id') id: string,
    @Body() command: AdminUpdateUserStatusCommand,
  ) {
    await this.commandService.updateUserStatus(actor, id, command);
    return { success: true };
  }
}
