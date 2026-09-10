import {
  type OtpIdentity,
  type OtpProvider,
  OtpProviderError,
} from './otp-provider.js';

export interface FirebaseDecodedIdToken {
  readonly uid?: unknown;
  readonly phone_number?: unknown;
  readonly email?: unknown;
  readonly name?: unknown;
}

export type FirebaseIdTokenVerifier = (
  idToken: string,
) => Promise<FirebaseDecodedIdToken>;

const DEFAULT_TIMEOUT_MS = 5_000;

async function unavailableFirebaseVerifier(): Promise<FirebaseDecodedIdToken> {
  throw new OtpProviderError(
    'OTP_PROVIDER_UNAVAILABLE',
    'Firebase OTP verifier is not configured',
  );
}

export class FirebaseOtpProvider implements OtpProvider {
  constructor(
    private readonly verifyIdToken: FirebaseIdTokenVerifier = unavailableFirebaseVerifier,
    private readonly timeoutMs = DEFAULT_TIMEOUT_MS,
  ) {}

  public async verify(idToken: string): Promise<OtpIdentity> {
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => {
        reject(
          new OtpProviderError(
            'OTP_PROVIDER_TIMEOUT',
            'Firebase OTP verification timed out',
          ),
        );
      }, this.timeoutMs);
    });

    try {
      const decoded = await Promise.race([this.verifyIdToken(idToken), timeout]);
      return this.mapDecodedToken(decoded);
    } catch (error) {
      if (error instanceof OtpProviderError) {
        throw error;
      }

      throw new OtpProviderError(
        'OTP_PROVIDER_REJECTED',
        'Firebase OTP verification failed',
      );
    } finally {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    }
  }

  private mapDecodedToken(decoded: FirebaseDecodedIdToken): OtpIdentity {
    const uid = typeof decoded.uid === 'string' ? decoded.uid : '';
    const phoneNumber =
      typeof decoded.phone_number === 'string' ? decoded.phone_number : '';
    const email = typeof decoded.email === 'string' ? decoded.email : '';
    const name = typeof decoded.name === 'string' ? decoded.name.trim() : '';

    // A valid identity needs a stable provider uid plus at least one verifiable
    // contact channel: phone (Phone Auth) or email (Google/Apple).
    if (uid.length === 0 || (phoneNumber.length === 0 && email.length === 0)) {
      throw new OtpProviderError(
        'OTP_PROVIDER_REJECTED',
        'Firebase OTP verification failed',
      );
    }

    return {
      providerUserId: uid,
      ...(phoneNumber.length > 0 ? { phoneNumber } : {}),
      ...(email.length > 0 ? { email } : {}),
      ...(name.length > 0 ? { name } : {}),
    };
  }
}
