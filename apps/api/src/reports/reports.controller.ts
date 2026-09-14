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
import { CreateReportDto } from './dto/create-report.dto.js';
import { ReportsService, type SupportTicketResponse } from './reports.service.js';

@Controller()
@UseFilters(ApiExceptionFilter)
@UseGuards(AccessTokenGuard, RoleGuard)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Post('orders/:id/reports')
  @RequireRoles('CUSTOMER')
  @HttpCode(HttpStatus.CREATED)
  createReport(
    @CurrentUser() actor: AuthenticatedActor,
    @Param('id') id: string,
    @Body() dto: CreateReportDto,
  ): Promise<SupportTicketResponse> {
    return this.reportsService.createReport(actor.userId, id, dto);
  }

  @Get('users/me/reports')
  @RequireRoles('CUSTOMER')
  listMyReports(@CurrentUser() actor: AuthenticatedActor): Promise<SupportTicketResponse[]> {
    return this.reportsService.listUserReports(actor.userId);
  }
}
