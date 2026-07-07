import { Inject, Injectable } from "@nestjs/common";
import type { Role } from "@leopard/shared";

import { PrismaService } from "../prisma/prisma.service";

export const AUTH_USER_REPOSITORY = Symbol("AUTH_USER_REPOSITORY");

export interface AuthUserRecord {
  id: string;
  email: string;
  name: string;
  role: Role;
  passwordHash: string;
}

export interface AuthUserRepository {
  findByEmail(email: string): Promise<AuthUserRecord | null>;
  findById(id: string): Promise<AuthUserRecord | null>;
}

@Injectable()
export class PrismaAuthUserRepository implements AuthUserRepository {
  constructor(
    @Inject(PrismaService)
    private readonly prisma: PrismaService
  ) {}

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email }
    });
  }

  async findById(id: string) {
    return this.prisma.user.findUnique({
      where: { id }
    });
  }
}
