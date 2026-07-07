import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";

import { PrismaService } from "../prisma/prisma.service";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import {
  AUTH_USER_REPOSITORY,
  PrismaAuthUserRepository
} from "./auth-user.repository";
import { JwtAuthGuard } from "./jwt-auth.guard";
import { JwtTokenService } from "./jwt-token.service";
import { RolesGuard } from "./roles.guard";
import { TOKEN_SERVICE } from "./token.service";

@Module({
  imports: [
    JwtModule.register({
      secret: getJwtSecret(),
      signOptions: { expiresIn: "8h" }
    })
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    PrismaService,
    JwtAuthGuard,
    RolesGuard,
    {
      provide: AUTH_USER_REPOSITORY,
      useClass: PrismaAuthUserRepository
    },
    {
      provide: TOKEN_SERVICE,
      useClass: JwtTokenService
    }
  ],
  exports: [AuthService, JwtAuthGuard, RolesGuard]
})
export class AuthModule {}

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error("JWT_SECRET is required to start the API.");
  }

  return secret;
}
