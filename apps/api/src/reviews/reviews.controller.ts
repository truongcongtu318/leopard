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
import type { OrderReview } from '@prisma/client';
import { CurrentUser, type AuthenticatedActor } from '../auth/decorators/current-user.js';
import { RequireRoles } from '../auth/decorators/require-roles.js';
import { AccessTokenGuard } from '../auth/guards/access-token.guard.js';
import { RoleGuard } from '../auth/guards/role.guard.js';
import { ApiExceptionFilter } from '../common/api-exception.filter.js';
import { CreateReviewDto } from './dto/create-review.dto.js';
import { ReviewsService } from './reviews.service.js';

@Controller('orders')
@UseFilters(ApiExceptionFilter)
@UseGuards(AccessTokenGuard, RoleGuard)
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Post(':id/reviews')
  @RequireRoles('CUSTOMER')
  @HttpCode(HttpStatus.CREATED)
  createReview(
    @CurrentUser() actor: AuthenticatedActor,
    @Param('id') id: string,
    @Body() dto: CreateReviewDto,
  ): Promise<OrderReview> {
    return this.reviewsService.createReview(actor.userId, id, dto);
  }

  @Get(':id/reviews')
  getReview(@Param('id') id: string): Promise<OrderReview> {
    return this.reviewsService.getReviewByOrderId(id);
  }
}
