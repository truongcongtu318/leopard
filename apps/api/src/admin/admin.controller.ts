import { Controller, Get, Patch, Post, Param, Body, Query, UseGuards } from '@nestjs/common';
import type { UserStatus } from '@prisma/client';
import { AdminQueryService } from './admin-query.service.js';
import { AdminCommandService } from './admin-command.service.js';
import { AdminDriverReviewService } from './admin-driver-review.service.js';
import { DriverDocumentService } from '../drivers/driver-document.service.js';
import { ApproveDriverDto, RejectDriverDto } from './dto/review-driver.dto.js';
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
    private readonly driverReviewService: AdminDriverReviewService,
    private readonly driverDocumentService: DriverDocumentService,
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

  @Get('drivers/applications')
  async getDriverApplications(@Query('status') status?: string) {
    return this.driverReviewService.listApplications(
      (status as UserStatus | undefined) ?? 'PENDING_APPROVAL',
    );
  }

  @Get('drivers/:id/documents')
  async getDriverDocuments(@Param('id') id: string) {
    return this.driverDocumentService.listDocumentsForUser(id);
  }

  @Post('drivers/:id/approve')
  async approveDriver(
    @CurrentUser() actor: AuthenticatedActor,
    @Param('id') id: string,
    @Body() body: ApproveDriverDto,
  ) {
    await this.driverReviewService.approve(actor, id, body.clientRequestId);
    return { success: true };
  }

  @Post('drivers/:id/reject')
  async rejectDriver(
    @CurrentUser() actor: AuthenticatedActor,
    @Param('id') id: string,
    @Body() body: RejectDriverDto,
  ) {
    await this.driverReviewService.reject(actor, id, body.reason, body.clientRequestId);
    return { success: true };
  }
}
