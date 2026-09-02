import { Body, Controller, Patch, UseFilters, UseGuards } from '@nestjs/common';
import { CurrentUser, type AuthenticatedActor } from '../auth/decorators/current-user.js';
import { AccessTokenGuard } from '../auth/guards/access-token.guard.js';
import { ApiExceptionFilter } from '../common/api-exception.filter.js';
import { CompleteProfileDto } from './dto/complete-profile.dto.js';
import { UsersService } from './users.service.js';

@Controller('users')
@UseFilters(ApiExceptionFilter)
@UseGuards(AccessTokenGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Patch('me')
  completeProfile(
    @CurrentUser() actor: AuthenticatedActor,
    @Body() dto: CompleteProfileDto,
  ) {
    return this.usersService.completeProfile(actor.userId, dto);
  }
}
