import { Body, Controller, Get, Headers, HttpCode, Post } from '@nestjs/common';

import { AuthService, type AuthResponse, type AuthUser } from './auth.service.js';
import { DemoLoginDto, FirebaseLoginDto } from './dto/login.dto.js';
import { RefreshDto } from './dto/refresh.dto.js';
import type { AuthSession } from './token.service.js';

@Controller()
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('auth/login/demo')
  public loginDemo(@Body() body: DemoLoginDto): Promise<AuthResponse> {
    return this.authService.loginDemo(body.accountId);
  }

  @Post('auth/firebase')
  public loginFirebase(@Body() body: FirebaseLoginDto): Promise<AuthResponse> {
    return this.authService.loginFirebase(body.idToken);
  }

  @Post('auth/refresh')
  public refresh(@Body() body: RefreshDto): Promise<AuthSession> {
    return this.authService.refresh(body.refreshToken);
  }

  @Post('auth/logout')
  @HttpCode(204)
  public logout(
    @Headers('authorization') authorization: string | undefined,
  ): Promise<void> {
    return this.authService.logout(authorization);
  }

  @Get('me')
  public getMe(
    @Headers('authorization') authorization: string | undefined,
  ): Promise<AuthUser> {
    return this.authService.getCurrentUser(authorization);
  }
}
