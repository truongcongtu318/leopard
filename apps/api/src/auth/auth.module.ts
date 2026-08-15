import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';

import { ApiExceptionFilter } from '../common/api-exception.filter.js';
import { DatabaseModule } from '../database/database.module.js';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import {
  ACCOUNT_STATUS_CACHE_OPTIONS,
  AccountStatusCache,
} from './guards/account-status-cache.js';
import { AccessTokenGuard } from './guards/access-token.guard.js';
import { RoleGuard } from './guards/role.guard.js';
import { ResourcePolicy } from './policies/resource-policy.js';
import {
  type FirebaseDecodedIdToken,
  FirebaseOtpProvider,
  type FirebaseIdTokenVerifier,
} from './providers/firebase-otp.provider.js';
import { createProductionFirebaseVerifier } from './providers/firebase-admin.verifier.js';
import { OTP_PROVIDER, OtpProviderError } from './providers/otp-provider.js';
import { RefreshSessionRepository } from './refresh-session.repository.js';
import { TokenService } from './token.service.js';

const LOCAL_FIREBASE_ENVS = new Set(['development', 'local', 'test']);

function createFirebaseOtpProvider(): FirebaseOtpProvider {
  const localVerifier = createConfiguredLocalFirebaseVerifier();
  const verifier =
    localVerifier ??
    (process.env.NODE_ENV === 'production'
      ? createProductionFirebaseVerifier(process.env)
      : undefined);

  return new FirebaseOtpProvider(verifier);
}

function createConfiguredLocalFirebaseVerifier():
  | FirebaseIdTokenVerifier
  | undefined {
  const tokenFixture = process.env.AUTH_FIREBASE_TEST_TOKENS;
  const nodeEnv = process.env.NODE_ENV ?? 'development';

  if (!tokenFixture || !LOCAL_FIREBASE_ENVS.has(nodeEnv)) {
    return undefined;
  }

  return async (idToken: string): Promise<FirebaseDecodedIdToken> => {
    const tokens = parseFirebaseTokenFixture(tokenFixture);
    const decoded = tokens[idToken];

    if (!decoded) {
      throw new OtpProviderError(
        'OTP_PROVIDER_REJECTED',
        'Firebase OTP verification failed',
      );
    }

    return decoded;
  };
}

function parseFirebaseTokenFixture(
  tokenFixture: string,
): Record<string, FirebaseDecodedIdToken> {
  try {
    const parsed = JSON.parse(tokenFixture) as unknown;
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      throw new Error('Fixture must be an object');
    }

    const tokens: Record<string, FirebaseDecodedIdToken> = {};
    for (const [token, decoded] of Object.entries(parsed)) {
      if (
        typeof decoded !== 'object' ||
        decoded === null ||
        Array.isArray(decoded)
      ) {
        throw new Error('Decoded token must be an object');
      }

      tokens[token] = decoded as FirebaseDecodedIdToken;
    }

    return tokens;
  } catch {
    throw new OtpProviderError(
      'OTP_PROVIDER_UNAVAILABLE',
      'Firebase OTP verifier is not configured',
    );
  }
}

@Module({
  imports: [DatabaseModule],
  controllers: [AuthController],
  providers: [
    AuthService,
    { provide: ACCOUNT_STATUS_CACHE_OPTIONS, useValue: undefined },
    AccountStatusCache,
    AccessTokenGuard,
    RoleGuard,
    ResourcePolicy,
    RefreshSessionRepository,
    TokenService,
    { provide: OTP_PROVIDER, useFactory: createFirebaseOtpProvider },
    { provide: APP_FILTER, useClass: ApiExceptionFilter },
  ],
  exports: [
    AuthService,
    TokenService,
    RefreshSessionRepository,
    AccountStatusCache,
    AccessTokenGuard,
    RoleGuard,
    ResourcePolicy,
  ],
})
export class AuthModule {}
