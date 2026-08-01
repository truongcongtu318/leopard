import { Inject, Injectable } from '@nestjs/common';
import type { Role, UserStatus } from '@prisma/client';
import type { OtpProvider } from './providers/otp-provider.js';

import { DomainError } from '../common/domain-error.js';
import { PrismaService } from '../database/prisma.service.js';
import { DemoOtpProvider } from './providers/demo-otp.provider.js';
import { OTP_PROVIDER, OtpProviderError } from './providers/otp-provider.js';
import { type AuthSession, TokenService } from './token.service.js';

export interface AuthUser {
  readonly id: string;
  readonly phone: string;
  readonly role: Role;
  readonly status: UserStatus;
}

export interface AuthResponse {
  readonly user: AuthUser;
  readonly session: AuthSession;
}

const DEMO_ROLES = new Map<string, Role>([
  ['customer', 'CUSTOMER'],
  ['driver', 'DRIVER'],
  ['fleet-owner', 'FLEET_OWNER'],
  ['admin', 'ADMIN'],
]);

const VALID_ROLES = new Set<Role>(['CUSTOMER', 'DRIVER', 'FLEET_OWNER', 'ADMIN']);

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tokenService: TokenService,
    @Inject(OTP_PROVIDER) private readonly firebaseOtpProvider: OtpProvider,
  ) {}

  public async loginDemo(accountId: string): Promise<AuthResponse> {
    const provider = new DemoOtpProvider({
      enabled: process.env.AUTH_DEMO_LOGIN_ENABLED === 'true',
      nodeEnv: process.env.NODE_ENV ?? 'development',
    });
    const identity = await this.verifyProviderToken(() => provider.verify(accountId), {
      disabledCode: 'DEMO_LOGIN_DISABLED',
      disabledMessage: 'Demo login is disabled',
    });
    const role = DEMO_ROLES.get(accountId);

    if (!role) {
      throw new DomainError(
        'INVALID_PROVIDER_TOKEN',
        401,
        'Provider token is invalid',
      );
    }

    return this.loginIdentity(identity.phoneNumber, role);
  }

  public async loginFirebase(idToken: string): Promise<AuthResponse> {
    const identity = await this.verifyProviderToken(() =>
      this.firebaseOtpProvider.verify(idToken),
    );

    return this.loginIdentity(identity.phoneNumber, this.defaultFirebaseRole());
  }

  public async getCurrentUser(authorization: string | undefined): Promise<AuthUser> {
    const token = this.extractBearerToken(authorization);
    const claims = this.tokenService.verifyAccessToken(token);
    const session = await this.prisma.refreshSession.findUnique({
      where: { id: claims.sessionId },
    });

    if (
      !session ||
      session.revokedAt !== null ||
      session.expiresAt.getTime() <= Date.now()
    ) {
      throw new DomainError('UNAUTHORIZED', 401, 'Authentication required');
    }

    const user = await this.prisma.user.findUnique({ where: { id: claims.sub } });
    if (!user) {
      throw new DomainError('UNAUTHORIZED', 401, 'Authentication required');
    }

    return this.requireActiveUser(user);
  }

  private async loginIdentity(phone: string, role: Role): Promise<AuthResponse> {
    const existingUser = await this.prisma.user.findUnique({ where: { phone } });
    const user =
      existingUser ??
      (await this.prisma.user.create({
        data: {
          phone,
          role,
          status: 'ACTIVE',
        },
      }));
    const activeUser = this.requireActiveUser(user);
    const session = await this.tokenService.createSession(activeUser);

    return { user: activeUser, session };
  }

  private requireActiveUser(user: AuthUser): AuthUser {
    if (user.status === 'DISABLED') {
      throw new DomainError('ACCOUNT_DISABLED', 403, 'Account is disabled');
    }

    return this.serializeUser(user);
  }

  private serializeUser(user: AuthUser): AuthUser {
    return {
      id: user.id,
      phone: user.phone,
      role: user.role,
      status: user.status,
    };
  }

  private async verifyProviderToken<T>(
    action: () => Promise<T>,
    options?: { readonly disabledCode: string; readonly disabledMessage: string },
  ): Promise<T> {
    try {
      return await action();
    } catch (error) {
      if (error instanceof OtpProviderError && error.code === 'OTP_PROVIDER_DISABLED') {
        throw new DomainError(
          options?.disabledCode ?? 'OTP_PROVIDER_UNAVAILABLE',
          options ? 403 : 503,
          options?.disabledMessage ?? 'OTP provider is unavailable',
        );
      }

      if (error instanceof OtpProviderError && error.code !== 'OTP_PROVIDER_REJECTED') {
        throw new DomainError(
          'OTP_PROVIDER_UNAVAILABLE',
          503,
          'OTP provider is unavailable',
        );
      }

      throw new DomainError(
        'INVALID_PROVIDER_TOKEN',
        401,
        'Provider token is invalid',
      );
    }
  }

  private extractBearerToken(authorization: string | undefined): string {
    if (!authorization?.startsWith('Bearer ')) {
      throw new DomainError('UNAUTHORIZED', 401, 'Authentication required');
    }

    const token = authorization.slice('Bearer '.length).trim();
    if (!token) {
      throw new DomainError('UNAUTHORIZED', 401, 'Authentication required');
    }

    return token;
  }

  private defaultFirebaseRole(): Role {
    const configuredRole = process.env.AUTH_FIREBASE_DEFAULT_ROLE;

    return VALID_ROLES.has(configuredRole as Role)
      ? (configuredRole as Role)
      : 'CUSTOMER';
  }
}
