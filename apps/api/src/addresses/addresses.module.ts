import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { AccountStatusCache } from '../auth/guards/account-status-cache.js';
import { DatabaseModule } from '../database/database.module.js';
import { AddressesController } from './addresses.controller.js';
import { AddressesService } from './addresses.service.js';

@Module({
  imports: [AuthModule, DatabaseModule],
  controllers: [AddressesController],
  providers: [AccountStatusCache, AddressesService],
  exports: [AddressesService],
})
export class AddressesModule {}
