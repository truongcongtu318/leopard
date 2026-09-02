import { Injectable } from '@nestjs/common';
import type { Role, UserStatus } from '@prisma/client';
import { DomainError } from '../common/domain-error.js';
import { PrismaService } from '../database/prisma.service.js';
import type { AuthUser } from '../auth/auth.service.js';
import type { CompleteProfileDto } from './dto/complete-profile.dto.js';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  public async completeProfile(
    userId: string,
    dto: CompleteProfileDto,
  ): Promise<AuthUser> {
    const current = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!current) {
      throw new DomainError('UNAUTHORIZED', 401, 'Bạn cần đăng nhập để tiếp tục');
    }
    if (current.phone == null) {
      throw new DomainError('PHONE_REQUIRED', 409, 'Vui lòng xác minh số điện thoại trước');
    }

    const now = new Date();
    try {
      const updated = await this.prisma.user.update({
        where: { id: userId },
        data: {
          name: dto.name.trim(),
          email: dto.email.trim(),
          ...(dto.avatarMediaId ? { avatarMediaId: dto.avatarMediaId } : {}),
          consentTermsAt: now,
          consentServiceAt: now,
          consentMarketing: dto.consentMarketing ?? false,
          consentThirdParty: dto.consentThirdParty ?? false,
          onboardedAt: now,
        },
      });
      return this.serialize(updated);
    } catch (err) {
      if (isUniqueEmailViolation(err)) {
        throw new DomainError('EMAIL_ALREADY_USED', 409, 'Email đã được sử dụng bởi tài khoản khác');
      }
      throw err;
    }
  }

  private serialize(u: {
    id: string; phone: string | null; email: string | null; name: string | null;
    role: Role; status: UserStatus; onboardedAt: Date | null;
  }): AuthUser {
    return {
      id: u.id,
      phone: u.phone,
      email: u.email,
      name: u.name,
      role: u.role,
      status: u.status,
      profileComplete: u.onboardedAt != null,
    };
  }
}

function isUniqueEmailViolation(err: unknown): boolean {
  const e = err as { code?: string; meta?: { target?: string[] | string } };
  const target = e?.meta?.target;
  const hitsEmail = Array.isArray(target) ? target.includes('email') : target === 'email' || String(target).includes('email');
  return e?.code === 'P2002' && hitsEmail;
}
