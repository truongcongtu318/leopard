import { Body, Controller, Get, Inject, Post, UseGuards } from "@nestjs/common";
import type { LoginRequest } from "@leopard/shared";

import { AuthService } from "./auth.service";
import { CurrentUser } from "./current-user.decorator";
import { JwtAuthGuard } from "./jwt-auth.guard";
import { Roles, RolesGuard } from "./roles.guard";
import type { JwtPayload } from "./token.service";

@Controller("auth")
export class AuthController {
  constructor(
    @Inject(AuthService)
    private readonly authService: AuthService
  ) {}

  @Post("login")
  login(@Body() credentials: LoginRequest) {
    return this.authService.login(credentials);
  }

  @Get("me")
  @Roles("CUSTOMER", "DRIVER", "ADMIN")
  @UseGuards(JwtAuthGuard, RolesGuard)
  me(@CurrentUser() user: JwtPayload) {
    return this.authService.getCurrentUser(user.sub);
  }
}
