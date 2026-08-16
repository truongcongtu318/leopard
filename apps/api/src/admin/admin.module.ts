import { Module } from '@nestjs/common';
import { AdminQueryService } from './admin-query.service.js';
import { AdminCommandService } from './admin-command.service.js';
import { AdminController } from './admin.controller.js';
import { DatabaseModule } from '../database/database.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { AuditModule } from '../audit/audit.module.js';

@Module({
  imports: [DatabaseModule, AuthModule, AuditModule],
  controllers: [AdminController],
  providers: [AdminQueryService, AdminCommandService],
})
export class AdminModule {}
