import type { Role } from "@leopard/shared";

import type { AuthUserRecord } from "./auth-user.repository";

export const TOKEN_SERVICE = Symbol("TOKEN_SERVICE");

export interface JwtPayload {
  sub: string;
  email: string;
  name: string;
  role: Role;
}

export interface TokenService {
  sign(user: AuthUserRecord): Promise<string>;
  verify(token: string): Promise<JwtPayload>;
}
