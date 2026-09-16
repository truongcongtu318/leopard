import { Controller, Get, Patch, Post, Put, Param, Body, Query, UseGuards } from '@nestjs/common';
import type { UserStatus } from '@prisma/client';
import { AdminQueryService } from './admin-query.service.js';
import { AdminCommandService } from './admin-command.service.js';
import { AdminDriverReviewService } from './admin-driver-review.service.js';
import { AdminWithdrawalReviewService } from './admin-withdrawal-review.service.js';
import { DriverDocumentService } from '../drivers/driver-document.service.js';
import { ApproveDriverDto, RejectDriverDto, RequestChangesDriverDto } from './dto/review-driver.dto.js';
import { ReviewWithdrawalDto } from './dto/review-withdrawal.dto.js';
import type { AuthenticatedActor } from '../auth/decorators/current-user.js';
import { CurrentUser } from '../auth/decorators/current-user.js';
import { AccessTokenGuard } from '../auth/guards/access-token.guard.js';
import { RoleGuard } from '../auth/guards/role.guard.js';
import { RequireRoles } from '../auth/decorators/require-roles.js';
import { parsePageQuery } from '@leopard/shared';
import type {
  AdminUserQuery,
  AdminDriverQuery,
  AdminOrderQuery,
  AdminUpdateUserStatusCommand,
  AdminPaymentQuery,
  AdminInvoiceQuery,
  AdminAuditQuery,
  AdminPromotionQuery,
  AdminCreatePromotionDto,
  AdminUpdatePromotionDto,
  AdminReportQuery,
  AdminResolveReportCommand,
  AdminReviewQuery,
  AdminHideReviewCommand,
  AdminDispatchQuery,
  AdminReassignOrderCommand,
  AdminBroadcastCommand,
  AdminBroadcastQuery,
  AdminUpdatePricingCommand,
  AdminSupportQuery,
  AdminSendSupportMessageCommand,
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
    private readonly withdrawalReviewService: AdminWithdrawalReviewService,
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

  @Get('drivers')
  async getDrivers(@Query() query: any) {
    const parsedQuery: AdminDriverQuery = {
      ...parsePageQuery({ page: query.page, pageSize: query.pageSize }),
      status: query.status,
      q: query.q,
    };
    return this.queryService.getDrivers(parsedQuery);
  }

  @Get('orders')
  async getOrders(@Query() query: any) {
    const parsedQuery: AdminOrderQuery = {
      ...parsePageQuery({ page: query.page, pageSize: query.pageSize }),
      status: query.status,
      driverId: query.driverId,
      from: query.from,
      to: query.to,
      q: query.q,
    };
    return this.queryService.getOrders(parsedQuery);
  }

  @Get('payments')
  async getPayments(@Query() query: any) {
    const parsedQuery: AdminPaymentQuery = {
      ...parsePageQuery({ page: query.page, pageSize: query.pageSize }),
      status: query.status,
      source: query.source,
      from: query.from,
      to: query.to,
      q: query.q,
    };
    return this.queryService.getPayments(parsedQuery);
  }

  @Get('invoices')
  async getInvoices(@Query() query: any) {
    const parsedQuery: AdminInvoiceQuery = {
      ...parsePageQuery({ page: query.page, pageSize: query.pageSize }),
      status: query.status,
      from: query.from,
      to: query.to,
      q: query.q,
      ...(query.missingEmail === true || query.missingEmail === 'true'
        ? { missingEmail: true }
        : query.missingEmail === false || query.missingEmail === 'false'
          ? { missingEmail: false }
          : {}),
    };
    return this.queryService.getInvoices(parsedQuery);
  }

  @Get('audit')
  async getAuditEntries(@Query() query: any) {
    const parsedQuery: AdminAuditQuery = {
      ...parsePageQuery({ page: query.page, pageSize: query.pageSize }),
      actorId: query.actorId,
      action: query.action,
      resourceType: query.resourceType,
      resourceId: query.resourceId,
      from: query.from,
      to: query.to,
    };
    return this.queryService.getAuditEntries(parsedQuery);
  }

  @Get('promotions')
  async getPromotions(@Query() query: any) {
    const parsedQuery: AdminPromotionQuery = {
      ...parsePageQuery({ page: query.page, pageSize: query.pageSize }),
      discountType: query.discountType,
      q: query.q,
      ...(query.isActive === true || query.isActive === 'true'
        ? { isActive: true }
        : query.isActive === false || query.isActive === 'false'
          ? { isActive: false }
          : {}),
    };
    return this.queryService.getPromotions(parsedQuery);
  }

  @Post('promotions')
  async createPromotion(
    @CurrentUser() actor: AuthenticatedActor,
    @Body() body: AdminCreatePromotionDto,
  ) {
    return this.commandService.createPromotion(actor, body);
  }

  @Patch('promotions/:id')
  async updatePromotion(
    @CurrentUser() actor: AuthenticatedActor,
    @Param('id') id: string,
    @Body() body: AdminUpdatePromotionDto,
  ) {
    return this.commandService.updatePromotion(actor, id, body);
  }

  @Get('reports')
  async getReports(@Query() query: any) {
    const parsedQuery: AdminReportQuery = {
      ...parsePageQuery({ page: query.page, pageSize: query.pageSize }),
      status: query.status,
      category: query.category,
      orderId: query.orderId,
      from: query.from,
      to: query.to,
      q: query.q,
    };
    return this.queryService.getReports(parsedQuery);
  }

  @Get('reports/:id')
  async getReportDetail(@Param('id') id: string) {
    return this.queryService.getReportDetail(id);
  }

  @Post('reports/:id/resolve')
  async resolveReport(
    @CurrentUser() actor: AuthenticatedActor,
    @Param('id') id: string,
    @Body() body: AdminResolveReportCommand,
  ) {
    return this.commandService.resolveReport(actor, id, body);
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

  @Get('drivers/:id/contract')
  async getDriverContract(@Param('id') id: string) {
    return this.driverReviewService.getContractEvidence(id);
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

  @Post('drivers/:id/request-changes')
  async requestChangesDriver(
    @CurrentUser() actor: AuthenticatedActor,
    @Param('id') id: string,
    @Body() body: RequestChangesDriverDto,
  ) {
    await this.driverReviewService.requestChanges(
      actor,
      id,
      body.reason,
      body.documentId,
      body.reasonCode,
      body.clientRequestId,
    );
    return { success: true };
  }


  @Get('withdrawals')
  async getPendingWithdrawals() {
    return this.withdrawalReviewService.listPending();
  }

  @Post('withdrawals/:id/approve')
  async approveWithdrawal(
    @CurrentUser() actor: AuthenticatedActor,
    @Param('id') id: string,
    @Body() body: ReviewWithdrawalDto,
  ) {
    await this.withdrawalReviewService.approve(actor, id, body.note, body.clientRequestId);
    return { success: true };
  }

  @Post('withdrawals/:id/reject')
  async rejectWithdrawal(
    @CurrentUser() actor: AuthenticatedActor,
    @Param('id') id: string,
    @Body() body: ReviewWithdrawalDto,
  ) {
    await this.withdrawalReviewService.reject(actor, id, body.note, body.clientRequestId);
    return { success: true };
  }

  @Get('reviews')
  async getReviews(@Query() query: any) {
    const parsedQuery: AdminReviewQuery = {
      ...parsePageQuery({ page: query.page, pageSize: query.pageSize }),
      minRating: query.minRating !== undefined && query.minRating !== '' ? Number(query.minRating) : undefined,
      maxRating: query.maxRating !== undefined && query.maxRating !== '' ? Number(query.maxRating) : undefined,
      driverId: query.driverId || undefined,
      customerId: query.customerId || undefined,
      from: query.from || undefined,
      to: query.to || undefined,
      q: query.q || undefined,
    };
    return this.queryService.getReviews(parsedQuery);
  }

  @Post('reviews/:id/hide')
  async hideReview(
    @CurrentUser() actor: AuthenticatedActor,
    @Param('id') id: string,
    @Body() body: AdminHideReviewCommand,
  ) {
    return this.commandService.hideReview(id, body, actor.userId);
  }

  @Get('dispatch/exceptions')
  async getDispatchExceptions(@Query() query: any) {
    const parsedQuery: AdminDispatchQuery = {
      ...parsePageQuery({ page: query.page, pageSize: query.pageSize }),
      vehicleType: query.vehicleType || undefined,
      q: query.q || undefined,
    };
    return this.queryService.getDispatchExceptions(parsedQuery);
  }

  @Post('dispatch/orders/:id/reassign')
  async reassignOrder(
    @CurrentUser() actor: AuthenticatedActor,
    @Param('id') id: string,
    @Body() body: AdminReassignOrderCommand,
  ) {
    return this.commandService.reassignOrder(id, body, actor);
  }

  @Post('notifications/broadcast')
  async broadcastNotification(
    @CurrentUser() actor: AuthenticatedActor,
    @Body() command: AdminBroadcastCommand,
  ) {
    return this.commandService.broadcastNotification(command, actor);
  }

  @Get('notifications/broadcasts')
  async getBroadcastHistory(@Query() query: any) {
    const parsedQuery: AdminBroadcastQuery = {
      ...parsePageQuery({ page: query.page, pageSize: query.pageSize }),
      q: query.q,
    };
    return this.queryService.getBroadcastHistory(parsedQuery);
  }

  @Get('pricing')
  async getPricingConfig() {
    return this.queryService.getPricingConfig();
  }

  @Put('pricing')
  async updatePricingConfig(
    @CurrentUser() actor: AuthenticatedActor,
    @Body() command: AdminUpdatePricingCommand,
  ) {
    return this.commandService.updatePricingConfig(command, actor);
  }

  @Get('support/conversations')
  async getSupportConversations(@Query() query: any) {
    const parsedQuery: AdminSupportQuery = {
      ...parsePageQuery({ page: query.page, pageSize: query.pageSize }),
      status: query.status,
      role: query.role,
      q: query.q,
    };
    return this.queryService.getSupportConversations(parsedQuery);
  }

  @Get('support/conversations/:orderId/messages')
  async getSupportMessages(@Param('orderId') orderId: string) {
    return this.queryService.getSupportMessages(orderId);
  }

  @Post('support/conversations/:orderId/messages')
  async sendSupportMessage(
    @CurrentUser() actor: AuthenticatedActor,
    @Param('orderId') orderId: string,
    @Body() body: AdminSendSupportMessageCommand,
  ) {
    return this.commandService.sendSupportMessage(orderId, body, actor);
  }
}

