import * as fs from 'node:fs';
import * as path from 'node:path';

import {
  type FirebaseDecodedIdToken,
  type FirebaseIdTokenVerifier,
} from './firebase-otp.provider.js';
import { OtpProviderError } from './otp-provider.js';

interface FirebaseAdminAuth {
  verifyIdToken(idToken: string, checkRevoked?: boolean): Promise<FirebaseDecodedIdToken>;
}

const REJECTED_CODES = new Set([
  'auth/argument-error',
  'auth/id-token-expired',
  'auth/id-token-revoked',
  'auth/invalid-id-token',
  'auth/user-disabled',
  'auth/user-not-found',
]);

export function createFirebaseAdminVerifier(auth: FirebaseAdminAuth): FirebaseIdTokenVerifier {
  return async (idToken) => {
    try {
      return await auth.verifyIdToken(idToken, true);
    } catch (error) {
      const code = firebaseErrorCode(error);
      if (!REJECTED_CODES.has(code)) {
        console.error('[FirebaseAdminVerifier] Verification failed unexpectedly:', error);
      }
      throw new OtpProviderError(
        REJECTED_CODES.has(code) ? 'OTP_PROVIDER_REJECTED' : 'OTP_PROVIDER_UNAVAILABLE',
        REJECTED_CODES.has(code)
          ? 'Firebase OTP verification failed'
          : 'Firebase OTP verifier is unavailable',
      );
    }
  };
}

export function createProductionFirebaseVerifier(
  source: NodeJS.ProcessEnv = process.env,
): FirebaseIdTokenVerifier {
  const projectId = source.FIREBASE_PROJECT_ID?.trim();
  if (!projectId) {
    throw new OtpProviderError(
      'OTP_PROVIDER_UNAVAILABLE',
      'Firebase OTP verifier is not configured',
    );
  }

  return async (idToken) => {
    try {
      const [{ applicationDefault, cert, getApp, initializeApp }, { getAuth }] =
        await Promise.all([import('firebase-admin/app'), import('firebase-admin/auth')]);

      let app;
      try {
        app = getApp('leopard-auth');
      } catch {
        const credential = resolveFirebaseCredential(source, cert, applicationDefault);
        app = initializeApp(
          {
            credential,
            projectId,
          },
          'leopard-auth',
        );
      }

      return createFirebaseAdminVerifier(getAuth(app))(idToken);
    } catch (error) {
      if (error instanceof OtpProviderError) {
        throw error;
      }

      console.error('[FirebaseAdminVerifier] Init failed:', error);
      throw new OtpProviderError(
        'OTP_PROVIDER_UNAVAILABLE',
        'Firebase OTP verifier is unavailable',
      );
    }
  };
}

function resolveFirebaseCredential(
  source: NodeJS.ProcessEnv,
  certFn: (sa: object) => ReturnType<typeof import('firebase-admin/app').cert>,
  appDefaultFn: () => ReturnType<typeof import('firebase-admin/app').applicationDefault>,
) {
  const rawCredPath = source.GOOGLE_APPLICATION_CREDENTIALS?.trim();
  if (rawCredPath) {
    const candidates = [
      rawCredPath,
      path.resolve(process.cwd(), rawCredPath),
      path.resolve(process.cwd(), 'apps/api', rawCredPath),
      path.resolve(process.cwd(), '..', rawCredPath),
    ];

    for (const candidate of candidates) {
      if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
        try {
          const serviceAccount = JSON.parse(fs.readFileSync(candidate, 'utf-8')) as object;
          return certFn(serviceAccount);
        } catch {
          // fallback to next
        }
      }
    }
  }

  return appDefaultFn();
}

function firebaseErrorCode(error: unknown): string {
  if (typeof error !== 'object' || error === null || !('code' in error)) {
    return '';
  }

  return typeof error.code === 'string' ? error.code : '';
}

