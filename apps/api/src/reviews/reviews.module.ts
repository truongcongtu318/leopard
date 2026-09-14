import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { AccountStatusCache } from '../auth/guards/account-status-cache.js';
import { DatabaseModule } from '../database/database.module.js';
import { ReviewsController } from './reviews.controller.js';
import { ReviewsService } from './reviews.service.js';

@Module({
  imports: [AuthModule, DatabaseModule],
  controllers: [ReviewsController],
  providers: [AccountStatusCache, ReviewsService],
  exports: [ReviewsService],
})
export class ReviewsModule {}
