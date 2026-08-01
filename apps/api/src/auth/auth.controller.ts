import { Body, Controller, Get, Headers, Post } from '@nestjs/common';

import { AuthService, type AuthResponse, type AuthUser } from './auth.service.js';
import { DemoLoginDto, FirebaseLoginDto } from './dto/login.dto.js';

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

  @Get('me')
  public getMe(
    @Headers('authorization') authorization: string | undefined,
  ): Promise<AuthUser> {
    return this.authService.getCurrentUser(authorization);
  }
}
