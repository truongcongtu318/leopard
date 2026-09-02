# Customer Registration Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Sau đăng nhập (SĐT hoặc Google), user chưa onboarding được đưa tới trang đăng ký Customer để điền tên/SĐT/email + đồng ý điều khoản (có prefill), trước khi vào app; user đã onboarding vào thẳng như cũ.

**Architecture:** Backend thêm mốc `User.onboardedAt` + cột consent, trả cờ `profileComplete` và prefill (name/email/phone) trong AuthUser; endpoint mới `PATCH /users/me` set onboardedAt. Mobile luồn `profileComplete` qua `exchangeIdToken` (bao phủ cả SĐT & Google), điều hướng tới màn `customer-register` mới; user Google verify SĐT bằng `POST /auth/phone/link` sẵn có. Trang KYC `register.tsx` đổi tên thành `driver-register.tsx`.

**Tech Stack:** NestJS + Prisma (PostgreSQL) ở `apps/api`; React Native + Expo Router + Firebase Auth ở `apps/mobile`; Jest.

**Spec:** [docs/superpowers/specs/2026-09-02-customer-registration-flow-design.md](../specs/2026-09-02-customer-registration-flow-design.md)

## Global Constraints

- **profileComplete = (User.onboardedAt != null).** Đây là tín hiệu duy nhất để điều hướng.
- **Migration BẮT BUỘC backfill** `onboardedAt = COALESCE(createdAt, now())` cho mọi user hiện có — sót là kéo toàn bộ user cũ về trang đăng ký.
- **Trường bắt buộc ở customer-register:** Họ và tên, Số điện thoại, Email. **Avatar tùy chọn.**
- **SĐT trong DB luôn đã xác thực** — chỉ được set qua login OTP hoặc `POST /auth/phone/link`. `PATCH /users/me` chỉ kiểm `phone != null`, không tự verify.
- **User Google verify SĐT** bằng luồng `linkPhone` ngay trong trang đăng ký; nút "Hoàn tất" khóa đến khi SĐT verified.
- **Copy hướng tới người dùng: tiếng Việt.** Lỗi trả về dùng `DomainError(code, httpStatus, 'thông điệp tiếng Việt')`.
- **Commit:** conventional commits (`feat:`, `test:`, `refactor:`, `chore:`).
- **Không đổi logic gán role:** user tự đăng ký vẫn CUSTOMER; DRIVER chỉ qua onboarding tài xế.

---

## File Structure

**Backend (`apps/api`)**
- `src/auth/providers/otp-provider.ts` — thêm `name?` vào `OtpIdentity`.
- `src/auth/providers/firebase-otp.provider.ts` — đọc claim `name` từ token.
- `prisma/schema.prisma` + `prisma/migrations/<ts>_customer_onboarding/migration.sql` — cột mới + backfill.
- `src/auth/auth.service.ts` — `AuthUser` mở rộng; `serializeUser`/`requireActiveUser` widen; `upsertIdentityUser` lưu name.
- `src/users/users.module.ts`, `users.controller.ts`, `users.service.ts`, `dto/complete-profile.dto.ts` — mới.
- `src/app.module.ts` — đăng ký `UsersModule`.

**Mobile (`apps/mobile`)**
- `src/auth/LoginScreen.tsx`, `src/features/auth/LoginScreen.tsx` — `onLoginSuccess` mang `profileComplete`.
- `app/(public)/login.tsx` — điều hướng theo `profileComplete`.
- `app/(public)/driver-register.tsx` — đổi tên từ `register.tsx`.
- `app/(public)/customer-register.tsx` — mới.
- `src/features/onboarding/OnboardingScreen.tsx` — cập nhật route tài xế.

---

## Task B1: Bắt tên (displayName) từ Firebase token

**Files:**
- Modify: `apps/api/src/auth/providers/otp-provider.ts:3-7`
- Modify: `apps/api/src/auth/providers/firebase-otp.provider.ts:7-11,64-84`
- Test: `apps/api/src/auth/providers/otp-provider.spec.ts`

**Interfaces:**
- Produces: `OtpIdentity` giờ có `readonly name?: string`. `FirebaseDecodedIdToken` có `readonly name?: unknown`.

- [ ] **Step 1: Viết test thất bại** — thêm vào `otp-provider.spec.ts`:

```ts
it('captures the display name from a Google identity token', async () => {
  const provider = new FirebaseOtpProvider(async () => ({
    uid: 'g-123',
    email: 'an@example.com',
    name: 'Nguyễn Văn An',
  }));

  const identity = await provider.verify('tok');

  expect(identity.name).toBe('Nguyễn Văn An');
});

it('omits name when the phone token has none', async () => {
  const provider = new FirebaseOtpProvider(async () => ({
    uid: 'p-1',
    phone_number: '+84900000001',
  }));

  const identity = await provider.verify('tok');

  expect(identity.name).toBeUndefined();
});
```

- [ ] **Step 2: Chạy test, xác nhận FAIL**

Run: `cd apps/api && npx jest src/auth/providers/otp-provider.spec.ts -t "display name"`
Expected: FAIL (`identity.name` undefined / property `name` không tồn tại trên type).

- [ ] **Step 3: Thêm `name` vào interface** — `otp-provider.ts`:

```ts
export interface OtpIdentity {
  readonly providerUserId: string;
  readonly phoneNumber?: string;
  readonly email?: string;
  readonly name?: string;
}
```

- [ ] **Step 4: Đọc claim `name`** — `firebase-otp.provider.ts`, mở rộng `FirebaseDecodedIdToken` và `mapDecodedToken`:

```ts
export interface FirebaseDecodedIdToken {
  readonly uid?: unknown;
  readonly phone_number?: unknown;
  readonly email?: unknown;
  readonly name?: unknown;
}
```

Trong `mapDecodedToken`, sau dòng `const email = ...`:

```ts
    const name = typeof decoded.name === 'string' ? decoded.name.trim() : '';
```

và phần return:

```ts
    return {
      providerUserId: uid,
      ...(phoneNumber.length > 0 ? { phoneNumber } : {}),
      ...(email.length > 0 ? { email } : {}),
      ...(name.length > 0 ? { name } : {}),
    };
```

- [ ] **Step 5: Chạy test, xác nhận PASS**

Run: `cd apps/api && npx jest src/auth/providers/otp-provider.spec.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/auth/providers/otp-provider.ts apps/api/src/auth/providers/firebase-otp.provider.ts apps/api/src/auth/providers/otp-provider.spec.ts
git commit -m "feat(auth): capture display name from firebase identity token"
```

---

## Task B2: Prisma migration — onboarding + consent + avatar

**Files:**
- Modify: `apps/api/prisma/schema.prisma:83-105` (model User)
- Create: `apps/api/prisma/migrations/<timestamp>_customer_onboarding/migration.sql`

**Interfaces:**
- Produces: cột `User.onboardedAt`, `consentTermsAt`, `consentServiceAt`, `consentMarketing`, `consentThirdParty`, `avatarMediaId`; toàn bộ user cũ có `onboardedAt != null`.

- [ ] **Step 1: Sửa `schema.prisma`** — thêm vào `model User` (ngay sau `emailVerifiedAt`):

```prisma
  onboardedAt       DateTime?            @db.Timestamptz(3)
  consentTermsAt    DateTime?            @db.Timestamptz(3)
  consentServiceAt  DateTime?            @db.Timestamptz(3)
  consentMarketing  Boolean              @default(false)
  consentThirdParty Boolean              @default(false)
  avatarMediaId     String?              @db.Uuid
```

- [ ] **Step 2: Tạo migration (chưa apply)**

Run: `cd apps/api && npx prisma migrate dev --name customer_onboarding --create-only`
Expected: sinh thư mục `prisma/migrations/<ts>_customer_onboarding/migration.sql` với các `ALTER TABLE ... ADD COLUMN`.

- [ ] **Step 3: Thêm backfill vào cuối `migration.sql`**

```sql
-- Existing users are considered already onboarded so they are not sent back
-- to the registration screen.
UPDATE "User" SET "onboardedAt" = COALESCE("createdAt", now()) WHERE "onboardedAt" IS NULL;
```

- [ ] **Step 4: Apply migration + regenerate client**

Run: `cd apps/api && npx prisma migrate dev && npx prisma generate`
Expected: migration applied; Prisma Client có các field mới (typecheck sẽ dùng ở B3).

- [ ] **Step 5: Commit**

```bash
git add apps/api/prisma/schema.prisma apps/api/prisma/migrations
git commit -m "feat(db): add onboarding + consent + avatar columns to User with backfill"
```

---

## Task B3: AuthUser — profileComplete + prefill (name/email) + lưu name khi upsert

**Files:**
- Modify: `apps/api/src/auth/auth.service.ts:12-17` (AuthUser), `:184-225` (upsertIdentityUser), `:258-273` (requireActiveUser/serializeUser)
- Test: `apps/api/src/auth/auth.service.spec.ts` (tạo nếu chưa có) hoặc mở rộng e2e hiện có

**Interfaces:**
- Consumes: cột mới từ B2; `OtpIdentity.name` từ B1.
- Produces: `AuthUser` = `{ id, phone, email, name, role, status, profileComplete }`. Mọi endpoint trả AuthUser (`/auth/firebase`, `/auth/login/demo`, `/auth/phone/link`, `/me`) đều mang các field này.

- [ ] **Step 1: Viết test thất bại** — tạo `apps/api/src/auth/auth.service.spec.ts`:

```ts
import { AuthService } from './auth.service.js';

describe('AuthService.serializeUser', () => {
  const svc = Object.create(AuthService.prototype) as {
    serializeUser: (u: unknown) => { profileComplete: boolean; name: string | null; email: string | null };
  };

  it('marks profileComplete when onboardedAt is set and exposes name/email', () => {
    const out = svc.serializeUser({
      id: 'u1', phone: '+84900000001', email: 'a@b.com', name: 'An',
      role: 'CUSTOMER', status: 'ACTIVE', onboardedAt: new Date(),
    });
    expect(out.profileComplete).toBe(true);
    expect(out.name).toBe('An');
    expect(out.email).toBe('a@b.com');
  });

  it('marks profileComplete false when onboardedAt is null', () => {
    const out = svc.serializeUser({
      id: 'u2', phone: '+84900000002', email: null, name: null,
      role: 'CUSTOMER', status: 'ACTIVE', onboardedAt: null,
    });
    expect(out.profileComplete).toBe(false);
  });
});
```

- [ ] **Step 2: Chạy test, xác nhận FAIL**

Run: `cd apps/api && npx jest src/auth/auth.service.spec.ts`
Expected: FAIL (`profileComplete`/`name` undefined).

- [ ] **Step 3: Mở rộng `AuthUser`** (`auth.service.ts:12`):

```ts
export interface AuthUser {
  readonly id: string;
  readonly phone: string | null;
  readonly email: string | null;
  readonly name: string | null;
  readonly role: Role;
  readonly status: UserStatus;
  readonly profileComplete: boolean;
}
```

- [ ] **Step 4: Widen `requireActiveUser` + `serializeUser`** (`auth.service.ts:258-273`):

```ts
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
```

Thêm type (gần đầu file, cạnh `AuthAccount`):

```ts
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
```

- [ ] **Step 5: Lưu name khi upsert** (`auth.service.ts:184-225`) — trong nhánh `create` thêm `name`, trong nhánh `update` backfill name nếu trống:

Nhánh `update` (thêm vào object `data`):

```ts
          ...(identity.name && !existing.name ? { name: identity.name } : {}),
```

Nhánh `create` (thêm vào `data`):

```ts
        ...(identity.name ? { name: identity.name } : {}),
```

Lưu ý: `AuthAccount` (dùng cho `existing`) cần thêm `readonly name: string | null;` để đọc `existing.name`.

- [ ] **Step 6: Chạy test, xác nhận PASS + typecheck**

Run: `cd apps/api && npx jest src/auth/auth.service.spec.ts && npx tsc --noEmit`
Expected: PASS, không lỗi type.

- [ ] **Step 7: Commit**

```bash
git add apps/api/src/auth/auth.service.ts apps/api/src/auth/auth.service.spec.ts
git commit -m "feat(auth): expose profileComplete + name/email and persist provider name"
```

---

## Task B4: Endpoint PATCH /users/me (hoàn tất hồ sơ)

**Files:**
- Create: `apps/api/src/users/dto/complete-profile.dto.ts`
- Create: `apps/api/src/users/users.service.ts`
- Create: `apps/api/src/users/users.controller.ts`
- Create: `apps/api/src/users/users.module.ts`
- Create: `apps/api/src/users/users.service.spec.ts`
- Modify: `apps/api/src/app.module.ts` (import UsersModule)

**Interfaces:**
- Consumes: `PrismaService`, `AccessTokenGuard`, `@CurrentUser() actor: AuthenticatedActor` (`actor.userId`), `AuthUser` từ B3.
- Produces: `PATCH /users/me` body `{ name, email, avatarMediaId?, consentTerms, consentService, consentMarketing?, consentThirdParty? }` → trả `AuthUser` (`profileComplete=true`). `UsersService.completeProfile(userId, dto): Promise<AuthUser>`.

- [ ] **Step 1: Viết DTO** — `dto/complete-profile.dto.ts`:

```ts
import {
  Equals,
  IsBoolean,
  IsEmail,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CompleteProfileDto {
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  declare name: string;

  @IsEmail()
  @MaxLength(255)
  declare email: string;

  @IsOptional()
  @IsUUID()
  declare avatarMediaId?: string;

  @Equals(true, { message: 'Bạn cần đồng ý Điều khoản & Chính sách' })
  declare consentTerms: true;

  @Equals(true, { message: 'Bạn cần đồng ý cho phép xử lý dữ liệu để cung cấp dịch vụ' })
  declare consentService: true;

  @IsOptional()
  @IsBoolean()
  declare consentMarketing?: boolean;

  @IsOptional()
  @IsBoolean()
  declare consentThirdParty?: boolean;
}
```

- [ ] **Step 2: Viết test service thất bại** — `users.service.spec.ts`:

```ts
import { UsersService } from './users.service.js';
import { DomainError } from '../common/domain-error.js';

function makeService(user: Record<string, unknown> | null) {
  const update = jest.fn().mockResolvedValue({
    id: 'u1', phone: '+84900000001', email: 'a@b.com', name: 'An',
    role: 'CUSTOMER', status: 'ACTIVE', onboardedAt: new Date(),
  });
  const prisma = {
    user: { findUnique: jest.fn().mockResolvedValue(user), update },
  };
  return { service: new UsersService(prisma as never), update };
}

const dto = {
  name: 'An', email: 'a@b.com', consentTerms: true as const, consentService: true as const,
};

describe('UsersService.completeProfile', () => {
  it('requires a verified phone before completing', async () => {
    const { service } = makeService({ id: 'u1', phone: null });
    await expect(service.completeProfile('u1', dto)).rejects.toBeInstanceOf(DomainError);
  });

  it('sets onboardedAt and returns profileComplete', async () => {
    const { service, update } = makeService({ id: 'u1', phone: '+84900000001' });
    const out = await service.completeProfile('u1', dto);
    expect(out.profileComplete).toBe(true);
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'u1' },
        data: expect.objectContaining({ name: 'An', email: 'a@b.com' }),
      }),
    );
  });
});
```

- [ ] **Step 3: Chạy test, xác nhận FAIL**

Run: `cd apps/api && npx jest src/users/users.service.spec.ts`
Expected: FAIL (module `users.service` chưa tồn tại).

- [ ] **Step 4: Viết `users.service.ts`**

```ts
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
```

- [ ] **Step 5: Chạy test, xác nhận PASS**

Run: `cd apps/api && npx jest src/users/users.service.spec.ts`
Expected: PASS.

- [ ] **Step 6: Viết controller** — `users.controller.ts`:

```ts
import { Body, Controller, Patch, UseFilters, UseGuards } from '@nestjs/common';
import { CurrentUser, type AuthenticatedActor } from '../auth/decorators/current-user.js';
import { AccessTokenGuard } from '../auth/guards/access-token.guard.js';
import { ApiExceptionFilter } from '../common/api-exception.filter.js';
import { CompleteProfileDto } from './dto/complete-profile.dto.js';
import { UsersService } from './users.service.js';

@Controller('users')
@UseFilters(ApiExceptionFilter)
@UseGuards(AccessTokenGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Patch('me')
  completeProfile(
    @CurrentUser() actor: AuthenticatedActor,
    @Body() dto: CompleteProfileDto,
  ) {
    return this.usersService.completeProfile(actor.userId, dto);
  }
}
```

- [ ] **Step 7: Viết module + đăng ký** — `users.module.ts`:

```ts
import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { AccountStatusCache } from '../auth/guards/account-status-cache.js';
import { DatabaseModule } from '../database/database.module.js';
import { UsersController } from './users.controller.js';
import { UsersService } from './users.service.js';

@Module({
  imports: [AuthModule, DatabaseModule],
  controllers: [UsersController],
  providers: [AccountStatusCache, UsersService],
  exports: [UsersService],
})
export class UsersModule {}
```

Trong `apps/api/src/app.module.ts`: thêm `import { UsersModule } from './users/users.module.js';` và đưa `UsersModule` vào mảng `imports`.

> Lưu ý: `AccessTokenGuard` cần `AccountStatusCache` (như `DriversModule` provide). Nếu guard lấy phụ thuộc từ nơi khác, đối chiếu cách `DriversModule` wire và làm theo.

- [ ] **Step 8: Typecheck + chạy toàn bộ test api**

Run: `cd apps/api && npx tsc --noEmit && npx jest src/users`
Expected: PASS, không lỗi type.

- [ ] **Step 9: Commit**

```bash
git add apps/api/src/users apps/api/src/app.module.ts
git commit -m "feat(users): add PATCH /users/me to complete customer profile"
```

---

## Task M1: Điều hướng theo profileComplete (bao phủ SĐT & Google)

**Files:**
- Modify: `apps/mobile/src/auth/LoginScreen.tsx:67-72` (props), `:74-80` (AuthResponse), `:548-555` (exchangeIdToken), `:672-677` (demo)
- Modify: `apps/mobile/src/features/auth/LoginScreen.tsx:10-15` (props mirror)
- Modify: `apps/mobile/app/(public)/login.tsx:10-26`
- Test: `apps/mobile/src/auth/login-route.test.tsx`

**Interfaces:**
- Produces: `onLoginSuccess?: (role: Role, profileComplete: boolean) => void`. `AuthResponse.user` có `profileComplete: boolean`, `name: string | null`, `email: string | null`.

- [ ] **Step 1: Viết test thất bại** — thêm vào `login-route.test.tsx` (dùng helper `loginWithGoogleAs` sẵn có hoặc mô phỏng login trả `profileComplete=false`):

```tsx
it('routes a not-yet-onboarded user to customer-register', async () => {
  // Arrange: mock /auth/firebase trả profileComplete=false (theo cách các test khác mock httpClient).
  // Act: thực hiện đăng nhập.
  // Assert:
  expect(replaceMock).toHaveBeenCalledWith('/(public)/customer-register');
});
```

> Bám đúng cách `login-route.test.tsx` hiện mock `httpClient` và `router`. Thêm field `profileComplete: false` vào payload user mock; giữ một test cũ (profileComplete=true) vẫn điều hướng `/customer/home`.

- [ ] **Step 2: Chạy test, xác nhận FAIL**

Run: `cd apps/mobile && npx jest src/auth/login-route.test.tsx -t "not-yet-onboarded"`
Expected: FAIL (vẫn điều hướng `/customer/home`).

- [ ] **Step 3: Cập nhật `AuthResponse` + props** — `src/auth/LoginScreen.tsx`:

```tsx
export interface LoginScreenProps {
  onLoginSuccess?: (role: Role, profileComplete: boolean) => void;
  onNavigateRegister?: () => void;
  allowDemo?: boolean;
  sessionExpired?: boolean;
}

interface AuthResponse {
  user: {
    id: string;
    phone: string;
    email: string | null;
    name: string | null;
    role: Role;
    status: string;
    profileComplete: boolean;
  };
  session: { accessToken: string; refreshToken: string };
}
```

(Đồng bộ y hệt khối `LoginScreenProps` trong `src/features/auth/LoginScreen.tsx`.)

- [ ] **Step 4: Luồn `profileComplete`** — `exchangeIdToken` (`:549`) và demo (`:677`):

```tsx
  const exchangeIdToken = async (idToken: string) => {
    const res = await httpClient.post<AuthResponse>('/auth/firebase', { idToken });
    const accessToken = res.session?.accessToken ?? '';
    const refreshToken = res.session?.refreshToken ?? '';
    await sessionStore.setSession(accessToken, refreshToken, res.user.role);
    onLoginSuccess?.(res.user?.role ?? 'CUSTOMER', res.user?.profileComplete ?? false);
  };
```

Demo:

```tsx
      onLoginSuccess?.(role, res.user?.profileComplete ?? false);
```

- [ ] **Step 5: Điều hướng** — `app/(public)/login.tsx`:

```tsx
  const handleLoginSuccess = (role: Role, profileComplete: boolean) => {
    if (!profileComplete) {
      router.replace('/(public)/customer-register');
      return;
    }
    switch (role) {
      case 'CUSTOMER':
        router.replace('/customer/home');
        break;
      case 'DRIVER':
        router.replace('/driver/orders');
        break;
      default:
        router.replace('/(public)/login');
        break;
    }
  };
```

- [ ] **Step 6: Chạy test, xác nhận PASS**

Run: `cd apps/mobile && npx jest src/auth/login-route.test.tsx`
Expected: PASS (cả nhánh true và false).

- [ ] **Step 7: Commit**

```bash
git add apps/mobile/src/auth/LoginScreen.tsx apps/mobile/src/features/auth/LoginScreen.tsx apps/mobile/app/\(public\)/login.tsx apps/mobile/src/auth/login-route.test.tsx
git commit -m "feat(mobile): route not-yet-onboarded users to customer registration"
```

---

## Task M2: Đổi tên trang đăng ký tài xế

**Files:**
- Rename: `apps/mobile/app/(public)/register.tsx` → `apps/mobile/app/(public)/driver-register.tsx`
- Modify: mọi tham chiếu `'/(public)/register'`

**Interfaces:**
- Produces: route `/(public)/driver-register` (nội dung KYC giữ nguyên).

- [ ] **Step 1: Tìm tham chiếu**

Run: `cd apps/mobile && npx grep -rn "(public)/register" app src` (hoặc dùng ripgrep: `rg "\(public\)/register" app src`)
Expected: liệt kê `login.tsx` (`onNavigateRegister`), `OnboardingScreen.tsx` (`onDriverRegister`), có thể test onboarding.

- [ ] **Step 2: Đổi tên file**

```bash
git mv apps/mobile/app/\(public\)/register.tsx apps/mobile/app/\(public\)/driver-register.tsx
```

- [ ] **Step 3: Cập nhật tham chiếu** — đổi mọi `'/(public)/register'` thành `'/(public)/driver-register'`. Trong `driver-register.tsx`, các link nội bộ tới `/(public)/login` giữ nguyên.

- [ ] **Step 4: Chạy test + typecheck**

Run: `cd apps/mobile && npx tsc --noEmit && npx jest --silent`
Expected: PASS (không route nào trỏ tới `register` cũ).

- [ ] **Step 5: Commit**

```bash
git add -A apps/mobile/app apps/mobile/src
git commit -m "refactor(mobile): rename register route to driver-register"
```

---

## Task M3: Màn customer-register (prefill + tên/email + consent + submit)

Phạm vi task này phục vụ user **đăng nhập bằng SĐT** (SĐT có sẵn, khóa). Nhánh verify SĐT cho Google ở Task M4.

**Files:**
- Create: `apps/mobile/app/(public)/customer-register.tsx`
- Test: `apps/mobile/app/(public)/customer-register.test.tsx`

**Interfaces:**
- Consumes: `httpClient.get('/me')` (trả `{ id, phone, email, name, role, status, profileComplete }`), `httpClient.patch('/users/me', body)`, `sessionStore`.
- Produces: màn với `testID` ổn định: `cr-name`, `cr-email`, `cr-consent-terms`, `cr-consent-service`, `cr-submit`.

- [ ] **Step 1: Viết test thất bại** — `customer-register.test.tsx`:

```tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import CustomerRegisterScreen from './customer-register';
import { httpClient } from '../../src/api/http-client';

jest.mock('../../src/api/http-client', () => ({
  httpClient: { get: jest.fn(), patch: jest.fn() },
}));
const replaceMock = jest.fn();
jest.mock('expo-router', () => ({ useRouter: () => ({ replace: replaceMock, push: jest.fn(), back: jest.fn() }) }));

beforeEach(() => {
  (httpClient.get as jest.Mock).mockResolvedValue({
    id: 'u1', phone: '+84900000001', email: null, name: null,
    role: 'CUSTOMER', status: 'ACTIVE', profileComplete: false,
  });
  (httpClient.patch as jest.Mock).mockResolvedValue({ role: 'CUSTOMER', profileComplete: true });
});

it('keeps submit disabled until name, email and required consents are provided', async () => {
  render(<CustomerRegisterScreen />);
  await waitFor(() => expect(httpClient.get).toHaveBeenCalledWith('/me'));

  const submit = screen.getByTestId('cr-submit');
  expect(submit.props.accessibilityState.disabled).toBe(true);

  fireEvent.changeText(screen.getByTestId('cr-name'), 'Nguyễn Văn An');
  fireEvent.changeText(screen.getByTestId('cr-email'), 'an@example.com');
  fireEvent.press(screen.getByTestId('cr-consent-terms'));
  fireEvent.press(screen.getByTestId('cr-consent-service'));

  expect(screen.getByTestId('cr-submit').props.accessibilityState.disabled).toBe(false);
});

it('submits PATCH /users/me and navigates home', async () => {
  render(<CustomerRegisterScreen />);
  await waitFor(() => expect(httpClient.get).toHaveBeenCalledWith('/me'));

  fireEvent.changeText(screen.getByTestId('cr-name'), 'An');
  fireEvent.changeText(screen.getByTestId('cr-email'), 'an@example.com');
  fireEvent.press(screen.getByTestId('cr-consent-terms'));
  fireEvent.press(screen.getByTestId('cr-consent-service'));
  fireEvent.press(screen.getByTestId('cr-submit'));

  await waitFor(() => expect(httpClient.patch).toHaveBeenCalledWith('/users/me', expect.objectContaining({
    name: 'An', email: 'an@example.com', consentTerms: true, consentService: true,
  })));
  await waitFor(() => expect(replaceMock).toHaveBeenCalledWith('/customer/home'));
});
```

- [ ] **Step 2: Chạy test, xác nhận FAIL**

Run: `cd apps/mobile && npx jest app/\(public\)/customer-register.test.tsx`
Expected: FAIL (file màn hình chưa tồn tại).

- [ ] **Step 3: Viết màn hình** — `customer-register.tsx`:

```tsx
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';

import { httpClient } from '../../src/api/http-client';
import { ApiError } from '../../src/api/api-error';
import { sessionStore } from '../../src/auth/session-store';

interface MeResponse {
  phone: string | null;
  email: string | null;
  name: string | null;
  role: string;
}

const isValidEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());

export default function CustomerRegisterScreen() {
  const router = useRouter();
  const [phone, setPhone] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [consentTerms, setConsentTerms] = useState(false);
  const [consentService, setConsentService] = useState(false);
  const [consentMarketing, setConsentMarketing] = useState(false);
  const [consentThirdParty, setConsentThirdParty] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const me = await httpClient.get<MeResponse>('/me');
        if (!active) return;
        setPhone(me.phone);
        if (me.name) setName(me.name);
        if (me.email) setEmail(me.email);
      } catch {
        // giữ form trống nếu prefill lỗi
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const canSubmit =
    Boolean(name.trim()) &&
    isValidEmail(email) &&
    Boolean(phone) &&
    consentTerms &&
    consentService &&
    !isSubmitting;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      const res = await httpClient.patch<{ role: string }>('/users/me', {
        name: name.trim(),
        email: email.trim(),
        consentTerms: true,
        consentService: true,
        consentMarketing,
        consentThirdParty,
      });
      await sessionStore.setSession(
        sessionStore.getAccessToken() ?? '',
        (await sessionStore.getRefreshToken()) ?? '',
        (res.role as never) ?? 'CUSTOMER',
      );
      router.replace('/customer/home');
    } catch (err) {
      const statusCode = (err as { statusCode?: number })?.statusCode ?? 0;
      const message = (err as { message?: string })?.message;
      if (statusCode === 401) setErrorMsg('Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại');
      else if (err instanceof ApiError && statusCode >= 400 && statusCode < 500)
        setErrorMsg(message ?? 'Thông tin chưa hợp lệ');
      else setErrorMsg(message ?? 'Đã xảy ra lỗi, vui lòng thử lại');
    } finally {
      setIsSubmitting(false);
    }
  };

  const Consent = ({
    testID, checked, onToggle, label,
  }: { testID: string; checked: boolean; onToggle: () => void; label: string }) => (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      onPress={onToggle}
      style={styles.consentRow}
      testID={testID}
    >
      <View style={[styles.checkbox, checked && styles.checkboxOn]}>
        {checked ? <Text style={styles.checkboxTick}>✓</Text> : null}
      </View>
      <Text style={styles.consentText}>{label}</Text>
    </Pressable>
  );

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <Text accessibilityRole="header" style={styles.headline}>Hoàn tất hồ sơ</Text>
      <Text style={styles.subline}>Chỉ một bước nữa để bắt đầu đặt đơn cùng LEOPARD.</Text>

      {errorMsg ? (
        <View style={styles.errorBox} testID="cr-error">
          <Text accessibilityRole="alert" style={styles.errorText}>{errorMsg}</Text>
        </View>
      ) : null}

      <View style={styles.card}>
        <Text style={styles.label}>Số điện thoại</Text>
        <View style={[styles.inputWrap, styles.inputLocked]}>
          <Text style={styles.lockedText}>{phone ?? '—'}</Text>
          <Text style={styles.lockIcon}>🔒</Text>
        </View>

        <Text style={styles.label}>Họ và tên</Text>
        <TextInput
          accessibilityLabel="Họ và tên"
          editable={!isSubmitting}
          onChangeText={setName}
          placeholder="VD: Nguyễn Văn A"
          placeholderTextColor="#94A3B8"
          style={styles.input}
          testID="cr-name"
          value={name}
        />

        <Text style={styles.label}>Email</Text>
        <TextInput
          accessibilityLabel="Email"
          autoCapitalize="none"
          editable={!isSubmitting}
          keyboardType="email-address"
          onChangeText={setEmail}
          placeholder="VD: an@example.com"
          placeholderTextColor="#94A3B8"
          style={styles.input}
          testID="cr-email"
          value={email}
        />
      </View>

      <View style={styles.card}>
        <Consent testID="cr-consent-terms" checked={consentTerms} onToggle={() => setConsentTerms((v) => !v)}
          label="Tôi đã đọc và đồng ý với Điều khoản & Chính sách của LEOPARD." />
        <Consent testID="cr-consent-service" checked={consentService} onToggle={() => setConsentService((v) => !v)}
          label="Cho phép LEOPARD xử lý dữ liệu cá nhân để thực hiện đơn hàng và cung cấp dịch vụ." />
        <Consent testID="cr-consent-marketing" checked={consentMarketing} onToggle={() => setConsentMarketing((v) => !v)}
          label="Nhận thông tin ưu đãi, marketing từ LEOPARD. (Tùy chọn)" />
        <Consent testID="cr-consent-third" checked={consentThirdParty} onToggle={() => setConsentThirdParty((v) => !v)}
          label="Cho phép chia sẻ dữ liệu cho đối tác thứ ba liên quan. (Tùy chọn)" />
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: !canSubmit, busy: isSubmitting }}
        disabled={!canSubmit}
        onPress={handleSubmit}
        style={({ pressed }) => [styles.primaryBtn, !canSubmit && styles.primaryBtnDisabled, pressed && styles.pressed]}
        testID="cr-submit"
      >
        <Text style={styles.primaryBtnText}>{isSubmitting ? 'Đang lưu...' : 'Hoàn tất'}</Text>
      </Pressable>

      <Pressable hitSlop={8} onPress={() => router.push('/(public)/driver-register')} style={styles.driverLink}>
        <Text style={styles.driverLinkText}>Đăng ký làm tài xế đối tác →</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, gap: 16, backgroundColor: '#F8FAFC' },
  headline: { fontSize: 24, fontWeight: '700', color: '#0F172A' },
  subline: { fontSize: 14, color: '#475569' },
  card: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, gap: 10 },
  label: { fontSize: 13, fontWeight: '600', color: '#334155' },
  input: { borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, color: '#0F172A' },
  inputWrap: { borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  inputLocked: { backgroundColor: '#F1F5F9' },
  lockedText: { fontSize: 15, color: '#0F172A' },
  lockIcon: { fontSize: 14 },
  consentRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, borderColor: '#CBD5E1', alignItems: 'center', justifyContent: 'center' },
  checkboxOn: { backgroundColor: '#2563EB', borderColor: '#2563EB' },
  checkboxTick: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  consentText: { flex: 1, fontSize: 13, color: '#334155', lineHeight: 18 },
  primaryBtn: { backgroundColor: '#2563EB', borderRadius: 14, paddingVertical: 15, alignItems: 'center' },
  primaryBtnDisabled: { backgroundColor: '#93C5FD' },
  primaryBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  pressed: { opacity: 0.85 },
  errorBox: { backgroundColor: '#FEF2F2', borderRadius: 12, padding: 12 },
  errorText: { color: '#B91C1C', fontSize: 13 },
  driverLink: { alignItems: 'center', paddingVertical: 8 },
  driverLinkText: { color: '#2563EB', fontSize: 14, fontWeight: '600' },
});
```

- [ ] **Step 4: Chạy test, xác nhận PASS**

Run: `cd apps/mobile && npx jest app/\(public\)/customer-register.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/app/\(public\)/customer-register.tsx apps/mobile/app/\(public\)/customer-register.test.tsx
git commit -m "feat(mobile): add customer registration screen with consent gating"
```

---

## Task M4: Verify SĐT cho user Google trong customer-register

**Files:**
- Modify: `apps/mobile/app/(public)/customer-register.tsx`
- Modify: `apps/mobile/app/(public)/customer-register.test.tsx`

**Interfaces:**
- Consumes: `sendPhoneOtp(rawPhone, containerId)` → `OtpChallenge`, `challenge.confirm(code)` → idToken (`src/auth/firebase-auth`); `httpClient.post('/auth/phone/link', { idToken })`.
- Produces: khi `/me.phone == null`, hiển thị ô nhập SĐT + "Gửi mã" + ô OTP + "Xác minh"; nút "Hoàn tất" khóa đến khi `phoneVerified === true`.

- [ ] **Step 1: Viết test thất bại** — thêm vào `customer-register.test.tsx`:

```tsx
it('requires phone verification for a Google user before submit is enabled', async () => {
  (httpClient.get as jest.Mock).mockResolvedValue({
    id: 'u1', phone: null, email: 'an@example.com', name: 'An',
    role: 'CUSTOMER', status: 'ACTIVE', profileComplete: false,
  });
  (httpClient.post as jest.Mock) = jest.fn().mockResolvedValue({ phone: '+84900000001' });

  render(<CustomerRegisterScreen />);
  await waitFor(() => expect(httpClient.get).toHaveBeenCalled());

  // Tên/email đã prefill; consent tick đủ nhưng SĐT chưa verify → submit vẫn khóa.
  fireEvent.press(screen.getByTestId('cr-consent-terms'));
  fireEvent.press(screen.getByTestId('cr-consent-service'));
  expect(screen.getByTestId('cr-submit').props.accessibilityState.disabled).toBe(true);

  // Nhập SĐT + gửi mã + nhập OTP + xác minh.
  fireEvent.changeText(screen.getByTestId('cr-phone-input'), '0900000001');
  fireEvent.press(screen.getByTestId('cr-send-otp'));
  await waitFor(() => screen.getByTestId('cr-otp-input'));
  fireEvent.changeText(screen.getByTestId('cr-otp-input'), '123456');
  fireEvent.press(screen.getByTestId('cr-verify-otp'));

  await waitFor(() => expect(httpClient.post).toHaveBeenCalledWith('/auth/phone/link', expect.any(Object)));
  await waitFor(() => expect(screen.getByTestId('cr-submit').props.accessibilityState.disabled).toBe(false));
});
```

Thêm mock firebase-auth ở đầu file test:

```tsx
jest.mock('../../src/auth/firebase-auth', () => ({
  sendPhoneOtp: jest.fn().mockResolvedValue({ confirm: jest.fn().mockResolvedValue('goog-otp-idtoken') }),
  resetRecaptcha: jest.fn(),
}));
```

- [ ] **Step 2: Chạy test, xác nhận FAIL**

Run: `cd apps/mobile && npx jest app/\(public\)/customer-register.test.tsx -t "Google user"`
Expected: FAIL (chưa có UI nhập/verify SĐT).

- [ ] **Step 3: Thêm state + UI verify SĐT** — trong `customer-register.tsx`:

Import thêm:

```tsx
import { View as RNView } from 'react-native';
import { sendPhoneOtp, resetRecaptcha, type OtpChallenge } from '../../src/auth/firebase-auth';
import { useRef } from 'react';

const RECAPTCHA_CONTAINER_ID = 'leopard-recaptcha-register';
```

State (thêm cạnh state hiện có):

```tsx
  const [phoneInput, setPhoneInput] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [phoneBusy, setPhoneBusy] = useState(false);
  const challengeRef = useRef<OtpChallenge | null>(null);
```

Coi SĐT là "sẵn sàng": `const phoneReady = Boolean(phone) || phoneVerified;`
Sửa `canSubmit` thay `Boolean(phone)` bằng `phoneReady`.

Handlers:

```tsx
  const sendOtp = async () => {
    if (phoneBusy || !phoneInput.trim()) return;
    setPhoneBusy(true);
    setErrorMsg(null);
    try {
      challengeRef.current = await sendPhoneOtp(phoneInput.trim(), RECAPTCHA_CONTAINER_ID);
      setOtpSent(true);
    } catch {
      resetRecaptcha();
      setErrorMsg('Không gửi được mã OTP, vui lòng thử lại');
    } finally {
      setPhoneBusy(false);
    }
  };

  const verifyOtp = async () => {
    const challenge = challengeRef.current;
    if (phoneBusy || !challenge || otpCode.trim().length < 6) return;
    setPhoneBusy(true);
    setErrorMsg(null);
    try {
      const idToken = await challenge.confirm(otpCode.trim());
      const linked = await httpClient.post<{ phone: string }>('/auth/phone/link', { idToken });
      setPhone(linked.phone);
      setPhoneVerified(true);
    } catch (err) {
      const message = (err as { message?: string })?.message;
      setErrorMsg(message ?? 'Xác minh số điện thoại thất bại');
    } finally {
      setPhoneBusy(false);
    }
  };
```

UI: thay khối SĐT khóa bằng nhánh điều kiện — nếu `phone` (đã có) hoặc `phoneVerified` → hiển thị khóa/badge; ngược lại hiển thị ô nhập + gửi/xác minh:

```tsx
        {phoneReady ? (
          <View style={[styles.inputWrap, styles.inputLocked]}>
            <Text style={styles.lockedText}>{phone ?? phoneInput}</Text>
            <Text style={styles.lockIcon}>{phoneVerified ? '✅' : '🔒'}</Text>
          </View>
        ) : (
          <View style={{ gap: 8 }}>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TextInput
                accessibilityLabel="Số điện thoại"
                editable={!otpSent}
                keyboardType="phone-pad"
                onChangeText={setPhoneInput}
                placeholder="VD: 0900 000 001"
                placeholderTextColor="#94A3B8"
                style={[styles.input, { flex: 1 }]}
                testID="cr-phone-input"
                value={phoneInput}
              />
              <Pressable
                accessibilityRole="button"
                disabled={phoneBusy || !phoneInput.trim()}
                onPress={sendOtp}
                style={styles.secondaryBtn}
                testID="cr-send-otp"
              >
                <Text style={styles.secondaryBtnText}>{otpSent ? 'Gửi lại' : 'Gửi mã'}</Text>
              </Pressable>
            </View>
            {otpSent ? (
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TextInput
                  accessibilityLabel="Mã OTP"
                  keyboardType="number-pad"
                  maxLength={6}
                  onChangeText={setOtpCode}
                  placeholder="Nhập 6 số OTP"
                  placeholderTextColor="#94A3B8"
                  style={[styles.input, { flex: 1 }]}
                  testID="cr-otp-input"
                  value={otpCode}
                />
                <Pressable
                  accessibilityRole="button"
                  disabled={phoneBusy || otpCode.trim().length < 6}
                  onPress={verifyOtp}
                  style={styles.secondaryBtn}
                  testID="cr-verify-otp"
                >
                  <Text style={styles.secondaryBtnText}>Xác minh</Text>
                </Pressable>
              </View>
            ) : null}
          </View>
        )}
        <RNView nativeID={RECAPTCHA_CONTAINER_ID} />
```

Thêm style:

```tsx
  secondaryBtn: { backgroundColor: '#E0E7FF', borderRadius: 12, paddingHorizontal: 14, justifyContent: 'center' },
  secondaryBtnText: { color: '#3730A3', fontWeight: '700' },
```

- [ ] **Step 4: Chạy test, xác nhận PASS**

Run: `cd apps/mobile && npx jest app/\(public\)/customer-register.test.tsx`
Expected: PASS (cả nhánh SĐT-locked và Google-verify).

- [ ] **Step 5: Typecheck toàn app + commit**

Run: `cd apps/mobile && npx tsc --noEmit`

```bash
git add apps/mobile/app/\(public\)/customer-register.tsx apps/mobile/app/\(public\)/customer-register.test.tsx
git commit -m "feat(mobile): verify phone via OTP for Google users in customer registration"
```

---

## Task M5 (tùy chọn): Avatar cho customer

Có thể bỏ qua mà vẫn có tính năng hoàn chỉnh (avatar là tùy chọn). Nếu làm:

**Backend**
- Thêm `POST /users/me/avatar` (multipart) vào `UsersController`, dùng `StorageProvider` + tạo `MediaObject` theo khuôn `DriverDocumentService` (`apps/api/src/drivers/driver-document.service.ts`), trả `{ mediaId }`.
- Wire `StorageProvider`/`MediaModule` vào `UsersModule` (như `DriversModule`).

**Mobile**
- Trong `customer-register.tsx` thêm nút "Tải ảnh" dùng `pickDeviceImage` (`apps/mobile/src/...`), `postForm('/users/me/avatar', form)` lấy `mediaId`, đưa vào body `PATCH /users/me` qua `avatarMediaId`. Có nút "Bỏ qua".

Mỗi phần một chu trình TDD riêng (test upload trả mediaId; test màn hình đính kèm avatarMediaId khi submit). Kết thúc bằng commit `feat: add optional avatar to customer registration`.

---

## Self-Review

**Spec coverage:**
- §5 luồng profileComplete → M1. ✅
- §6.1 migration/backfill → B2. ✅
- §6.2 bắt name provider → B1 + B3 (upsert). ✅
- §6.3 AuthUser mở rộng → B3. ✅
- §6.4 PATCH /users/me → B4. ✅
- §6.5 verify SĐT Google (linkPhone) → M4 (dùng endpoint có sẵn). ✅
- §7.2 màn customer-register → M3 + M4. ✅
- §7.3 đổi tên driver-register → M2. ✅
- §7.4 session store cập nhật sau hoàn tất → M3 (setSession sau PATCH). ✅
- §8 avatar (tùy chọn) → M5. ✅

**Type consistency:** `AuthUser` (B3) = `{id, phone, email, name, role, status, profileComplete}` dùng nhất quán ở B4 `serialize` và mobile `AuthResponse.user` (M1). `onLoginSuccess(role, profileComplete)` khớp giữa LoginScreen (M1) và login.tsx (M1). `completeProfile(userId, dto)` (B4) khớp controller. `sendPhoneOtp`/`OtpChallenge.confirm` (M4) khớp `firebase-auth.ts`.

**Placeholder scan:** không có TBD/TODO; các bước có code cụ thể. Test M1 mô tả bám theo cách mock của `login-route.test.tsx` hiện có (không thể copy nguyên văn vì chưa đọc file) — người thực thi đọc file đó để khớp cách mock; đây là ghi chú bám-khuôn, không phải placeholder logic.
