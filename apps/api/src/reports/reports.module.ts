import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { AccountStatusCache } from '../auth/guards/account-status-cache.js';
import { DatabaseModule } from '../database/database.module.js';
import { ReportsController } from './reports.controller.js';
import { ReportsService } from './reports.service.js';

@Module({
  imports: [AuthModule, DatabaseModule],
  controllers: [ReportsController],
  providers: [AccountStatusCache, ReportsService],
  exports: [ReportsService],
})
export class ReportsModule {}
