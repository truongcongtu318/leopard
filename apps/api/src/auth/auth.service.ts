import { Inject, Injectable } from "@nestjs/common";
import type { LoginRequest, LoginResponse, UserDto } from "@leopard/shared";

import {
  AUTH_USER_REPOSITORY,
  type AuthUserRecord,
  type AuthUserRepository
} from "./auth-user.repository";
import { invalidCredentialsException, tokenRequiredException } from "./auth.errors";
import { verifyPassword } from "./password.service";
import { TOKEN_SERVICE, type TokenService } from "./token.service";

@Injectable()
export class AuthService {
  constructor(
    @Inject(AUTH_USER_REPOSITORY)
    private readonly users: AuthUserRepository,
    @Inject(TOKEN_SERVICE)
    private readonly tokens: TokenService
  ) {}

  async login(credentials: LoginRequest): Promise<LoginResponse> {
    if (
      !isRecord(credentials) ||
      !isNonEmptyString(credentials.email) ||
      !isNonEmptyString(credentials.password)
    ) {
      throw invalidCredentialsException();
    }

    const user = await this.users.findByEmail(credentials.email);

    if (!user || !verifyPassword(credentials.password, user.passwordHash)) {
      throw invalidCredentialsException();
    }

    return {
      accessToken: await this.tokens.sign(user),
      user: toUserDto(user)
    };
  }

  async getCurrentUser(userId: string): Promise<UserDto> {
    const user = await this.users.findById(userId);

    if (!user) {
      throw tokenRequiredException();
    }

    return toUserDto(user);
  }
}

function toUserDto(user: AuthUserRecord): UserDto {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role
  };
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
