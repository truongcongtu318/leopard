import { Body, Controller, Patch, Post, UploadedFile, UseFilters, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CurrentUser, type AuthenticatedActor } from '../auth/decorators/current-user.js';
import { AccessTokenGuard } from '../auth/guards/access-token.guard.js';
import { ApiExceptionFilter } from '../common/api-exception.filter.js';
import { DomainError } from '../common/domain-error.js';
import { AvatarService } from './avatar.service.js';
import { CompleteProfileDto } from './dto/complete-profile.dto.js';
import { UsersService } from './users.service.js';

@Controller('users')
@UseFilters(ApiExceptionFilter)
@UseGuards(AccessTokenGuard)
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly avatarService: AvatarService,
  ) {}

  @Patch('me')
  completeProfile(
    @CurrentUser() actor: AuthenticatedActor,
    @Body() dto: CompleteProfileDto,
  ) {
    return this.usersService.completeProfile(actor.userId, dto);
  }

  @Post('me/avatar')
  @UseInterceptors(FileInterceptor('file'))
  uploadAvatar(
    @CurrentUser() actor: AuthenticatedActor,
    @UploadedFile() file: { buffer: Buffer } | undefined,
  ) {
    if (!file) {
      throw new DomainError('VALIDATION_ERROR', 422, 'File là bắt buộc');
    }
    return this.avatarService.uploadAvatar(actor, file.buffer);
  }
}
