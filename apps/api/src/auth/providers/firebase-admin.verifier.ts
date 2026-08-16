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
      const [{ applicationDefault, getApp, initializeApp }, { getAuth }] =
        await Promise.all([import('firebase-admin/app'), import('firebase-admin/auth')]);

      let app;
      try {
        app = getApp('leopard-auth');
      } catch {
        app = initializeApp(
          {
            credential: applicationDefault(),
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

      throw new OtpProviderError(
        'OTP_PROVIDER_UNAVAILABLE',
        'Firebase OTP verifier is unavailable',
      );
    }
  };
}

function firebaseErrorCode(error: unknown): string {
  if (typeof error !== 'object' || error === null || !('code' in error)) {
    return '';
  }

  return typeof error.code === 'string' ? error.code : '';
}
