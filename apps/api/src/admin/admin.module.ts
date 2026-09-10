import { Module } from '@nestjs/common';
import { AdminQueryService } from './admin-query.service.js';
import { AdminCommandService } from './admin-command.service.js';
import { AdminDriverReviewService } from './admin-driver-review.service.js';
import { AdminController } from './admin.controller.js';
import { DatabaseModule } from '../database/database.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { AuditModule } from '../audit/audit.module.js';
import { DriversModule } from '../drivers/drivers.module.js';

@Module({
  imports: [DatabaseModule, AuthModule, AuditModule, DriversModule],
  controllers: [AdminController],
  providers: [AdminQueryService, AdminCommandService, AdminDriverReviewService],
})
export class AdminModule {}
