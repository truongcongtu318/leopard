import { Body, Controller, Get, HttpCode, HttpStatus, Post, UseFilters, UseGuards } from '@nestjs/common';
import { AccessTokenGuard } from '../auth/guards/access-token.guard.js';
import { ApiExceptionFilter } from '../common/api-exception.filter.js';
import { ValidateVoucherDto } from './dto/validate-voucher.dto.js';
import { PromotionsService, type ValidateVoucherResult } from './promotions.service.js';

@Controller('promotions')
@UseFilters(ApiExceptionFilter)
export class PromotionsController {
  constructor(private readonly promotionsService: PromotionsService) {}

  @Get()
  async getPromotions() {
    return this.promotionsService.getActivePromotions();
  }

  @Post('validate')
  @HttpCode(HttpStatus.OK)
  async validate(@Body() dto: ValidateVoucherDto): Promise<ValidateVoucherResult> {
    return this.promotionsService.validateVoucher(dto.code, dto.orderAmountVnd);
  }
}
