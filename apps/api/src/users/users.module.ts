import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { AccountStatusCache } from '../auth/guards/account-status-cache.js';
import { DatabaseModule } from '../database/database.module.js';
import { UsersController } from './users.controller.js';
import { UsersService } from './users.service.js';

@Module({
  imports: [AuthModule, DatabaseModule],
  controllers: [UsersController],
  providers: [AccountStatusCache, UsersService],
  exports: [UsersService],
})
export class UsersModule {}
