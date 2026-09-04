import { Inject, Injectable } from '@nestjs/common';
import type { Role, UserStatus } from '@prisma/client';
import type { OtpIdentity, OtpProvider } from './providers/otp-provider.js';

import { DomainError } from '../common/domain-error.js';
import { PrismaService } from '../database/prisma.service.js';
import { DemoOtpProvider } from './providers/demo-otp.provider.js';
import { OTP_PROVIDER, OtpProviderError } from './providers/otp-provider.js';
import { RefreshSessionRepository } from './refresh-session.repository.js';
import { type AuthSession, TokenService } from './token.service.js';

export interface AuthUser {
  readonly id: string;
  readonly phone: string | null;
  readonly email: string | null;
  readonly name: string | null;
  readonly role: Role;
  readonly status: UserStatus;
  readonly profileComplete: boolean;
}

/** Prisma user shape needed to serialize an AuthUser response. */
interface SerializableUser {
  readonly id: string;
  readonly phone: string | null;
  readonly email: string | null;
  readonly name: string | null;
  readonly role: Role;
  readonly status: UserStatus;
  readonly onboardedAt: Date | null;
}

export interface AuthResponse {
  readonly user: AuthUser;
  readonly session: AuthSession;
}

/** Account fields read while resolving/linking a provider identity. */
interface AuthAccount {
  readonly id: string;
  readonly firebaseUid: string | null;
  readonly phone: string | null;
  readonly email: string | null;
  readonly phoneVerifiedAt: Date | null;
  readonly emailVerifiedAt: Date | null;
  readonly name: string | null;
  readonly role: Role;
  readonly status: UserStatus;
}

const DEMO_ROLES = new Map<string, Role>([
  ['customer', 'CUSTOMER'],
  ['driver', 'DRIVER'],
  ['fleet-owner', 'FLEET_OWNER'],
  ['admin', 'ADMIN'],
]);

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tokenService: TokenService,
    private readonly refreshSessions: RefreshSessionRepository,
    @Inject(OTP_PROVIDER) private readonly firebaseOtpProvider: OtpProvider,
  ) {}

  public async loginDemo(accountId: string): Promise<AuthResponse> {
    const provider = new DemoOtpProvider({
      enabled: process.env.AUTH_DEMO_LOGIN_ENABLED === 'true',
      nodeEnv: process.env.NODE_ENV ?? 'development',
    });
    const identity = await this.verifyProviderToken(() => provider.verify(accountId), {
      disabledCode: 'DEMO_LOGIN_DISABLED',
      disabledMessage: 'Đăng nhập demo đang bị tắt',
    });
    const role = DEMO_ROLES.get(accountId);

    if (!role) {
      throw new DomainError(
        'INVALID_PROVIDER_TOKEN',
        401,
        'Thông tin xác thực không hợp lệ',
      );
    }

    return this.loginWithIdentity(identity, role);
  }

  public async loginFirebase(idToken: string): Promise<AuthResponse> {
    const identity = await this.verifyProviderToken(() =>
      this.firebaseOtpProvider.verify(idToken),
    );

    // Role is resolved from the account (existing role, or CUSTOMER for a
    // brand-new self sign-up). DRIVER is granted only via driver onboarding.
    return this.loginWithIdentity(identity, 'CUSTOMER');
  }

  public async linkPhone(
    authorization: string | undefined,
    idToken: string,
  ): Promise<AuthUser> {
    const token = this.extractBearerToken(authorization);
    const claims = this.tokenService.verifyAccessToken(token);
    const identity = await this.verifyProviderToken(() =>
      this.firebaseOtpProvider.verify(idToken),
    );

    if (!identity.phoneNumber) {
      throw new DomainError(
        'INVALID_PROVIDER_TOKEN',
        401,
        'Thông tin xác thực không hợp lệ',
      );
    }

    const altPhone = this.alternateVnPhone(identity.phoneNumber);
    const owner =
      (await this.prisma.user.findUnique({
        where: { phone: identity.phoneNumber },
      })) ??
      (altPhone
        ? await this.prisma.user.findUnique({
            where: { phone: altPhone },
          })
        : null);
    if (owner && owner.id !== claims.sub) {
      throw new DomainError(
        'PHONE_ALREADY_LINKED',
        409,
        'Số điện thoại đã được liên kết với tài khoản khác',
      );
    }

    const user = await this.prisma.user.update({
      where: { id: claims.sub },
      data: { phone: identity.phoneNumber, phoneVerifiedAt: new Date() },
    });

    return this.requireActiveUser(user);
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
      throw new DomainError('UNAUTHORIZED', 401, 'Bạn cần đăng nhập để tiếp tục');
    }

    const user = await this.prisma.user.findUnique({ where: { id: claims.sub } });
    if (!user) {
      throw new DomainError('UNAUTHORIZED', 401, 'Bạn cần đăng nhập để tiếp tục');
    }

    return this.requireActiveUser(user);
  }

  public async refresh(refreshToken: string): Promise<AuthSession> {
    const refreshSession = await this.refreshSessions.rotate(refreshToken);
    const user = await this.prisma.user.findUnique({
      where: { id: refreshSession.record.userId },
    });

    if (!user) {
      throw new DomainError('UNAUTHORIZED', 401, 'Bạn cần đăng nhập để tiếp tục');
    }

    return this.tokenService.createAuthSession(
      this.requireActiveUser(user),
      refreshSession,
    );
  }

  public async logout(authorization: string | undefined): Promise<void> {
    const token = this.extractBearerToken(authorization);
    const claims = this.tokenService.verifyAccessToken(token);

    await this.refreshSessions.revoke(claims.sessionId);
  }

  private async loginWithIdentity(
    identity: OtpIdentity,
    newUserRole: Role,
  ): Promise<AuthResponse> {
    const user = await this.upsertIdentityUser(identity, newUserRole);
    const activeUser = this.requireActiveUser(user);
    const session = await this.tokenService.createSession(activeUser);

    return { user: activeUser, session };
  }

  /**
   * Resolves the account for a verified provider identity, keyed on the stable
   * Firebase uid, then linked by verified phone or email. A first-time sign-in
   * creates the account with the given default role; existing accounts keep
   * their role and get the newly verified channels back-filled.
   */
  private async upsertIdentityUser(
    identity: OtpIdentity,
    newUserRole: Role,
  ): Promise<SerializableUser> {
    const existing = await this.findLinkableUser(identity);
    const now = new Date();

    if (existing) {
      return this.prisma.user.update({
        where: { id: existing.id },
        data: {
          firebaseUid: existing.firebaseUid ?? identity.providerUserId,
          ...(identity.phoneNumber && (!existing.phone || existing.phone !== identity.phoneNumber)
            ? { phone: identity.phoneNumber }
            : {}),
          ...(identity.email && !existing.email
            ? { email: identity.email }
            : {}),
          ...(identity.phoneNumber && !existing.phoneVerifiedAt
            ? { phoneVerifiedAt: now }
            : {}),
          ...(identity.email && !existing.emailVerifiedAt
            ? { emailVerifiedAt: now }
            : {}),
          ...(identity.name && !existing.name ? { name: identity.name } : {}),
        },
      });
    }

    return this.prisma.user.create({
      data: {
        firebaseUid: identity.providerUserId,
        role: newUserRole,
        status: 'ACTIVE',
        ...(identity.phoneNumber
          ? { phone: identity.phoneNumber, phoneVerifiedAt: now }
          : {}),
        ...(identity.email
          ? { email: identity.email, emailVerifiedAt: now }
          : {}),
        ...(identity.name ? { name: identity.name } : {}),
      },
    });
  }

  private async findLinkableUser(
    identity: OtpIdentity,
  ): Promise<AuthAccount | null> {
    const byUid = await this.prisma.user.findUnique({
      where: { firebaseUid: identity.providerUserId },
    });
    if (byUid) {
      return byUid;
    }

    if (identity.phoneNumber) {
      const byPhone = await this.prisma.user.findUnique({
        where: { phone: identity.phoneNumber },
      });
      if (byPhone) {
        return byPhone;
      }

      const altPhone = this.alternateVnPhone(identity.phoneNumber);
      if (altPhone) {
        const byAlt = await this.prisma.user.findUnique({
          where: { phone: altPhone },
        });
        if (byAlt) {
          return byAlt;
        }
      }
    }

    if (identity.email) {
      const byEmail = await this.prisma.user.findUnique({
        where: { email: identity.email },
      });
      if (byEmail) {
        return byEmail;
      }
    }

    return null;
  }

  private alternateVnPhone(phone: string): string | null {
    if (phone.startsWith('+84') && phone.length === 12) {
      return '0' + phone.slice(3);
    }
    if (phone.startsWith('0') && phone.length === 10) {
      return '+84' + phone.slice(1);
    }
    return null;
  }

  private requireActiveUser(user: SerializableUser): AuthUser {
    if (user.status === 'DISABLED') {
      throw new DomainError('ACCOUNT_DISABLED', 403, 'Tài khoản đã bị vô hiệu hóa');
    }

    return this.serializeUser(user);
  }

  private serializeUser(user: SerializableUser): AuthUser {
    return {
      id: user.id,
      phone: user.phone,
      email: user.email,
      name: user.name,
      role: user.role,
      status: user.status,
      profileComplete: user.onboardedAt != null,
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
          options?.disabledMessage ?? 'Hệ thống xác thực tạm thời không khả dụng',
        );
      }

      if (error instanceof OtpProviderError && error.code !== 'OTP_PROVIDER_REJECTED') {
        throw new DomainError(
          'OTP_PROVIDER_UNAVAILABLE',
          503,
          'Hệ thống xác thực tạm thời không khả dụng',
        );
      }

      throw new DomainError(
        'INVALID_PROVIDER_TOKEN',
        401,
        'Thông tin xác thực không hợp lệ',
      );
    }
  }

  private extractBearerToken(authorization: string | undefined): string {
    if (!authorization?.startsWith('Bearer ')) {
      throw new DomainError('UNAUTHORIZED', 401, 'Bạn cần đăng nhập để tiếp tục');
    }

    const token = authorization.slice('Bearer '.length).trim();
    if (!token) {
      throw new DomainError('UNAUTHORIZED', 401, 'Bạn cần đăng nhập để tiếp tục');
    }

    return token;
  }
}
