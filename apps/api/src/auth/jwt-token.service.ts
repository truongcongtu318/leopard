import { Inject, Injectable } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";

import type { AuthUserRecord } from "./auth-user.repository";
import type { JwtPayload, TokenService } from "./token.service";

@Injectable()
export class JwtTokenService implements TokenService {
  constructor(
    @Inject(JwtService)
    private readonly jwtService: JwtService
  ) {}

  async sign(user: AuthUserRecord) {
    return this.jwtService.signAsync({
      sub: user.id,
      email: user.email,
      name: user.name,
      role: user.role
    } satisfies JwtPayload);
  }

  async verify(token: string) {
    return this.jwtService.verifyAsync<JwtPayload>(token);
  }
}
