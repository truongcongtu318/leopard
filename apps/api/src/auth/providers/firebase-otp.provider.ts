import {
  type OtpIdentity,
  type OtpProvider,
  OtpProviderError,
} from './otp-provider.js';

export interface FirebaseDecodedIdToken {
  readonly uid?: unknown;
  readonly phone_number?: unknown;
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
    if (
      typeof decoded.uid !== 'string' ||
      decoded.uid.length === 0 ||
      typeof decoded.phone_number !== 'string' ||
      decoded.phone_number.length === 0
    ) {
      throw new OtpProviderError(
        'OTP_PROVIDER_REJECTED',
        'Firebase OTP verification failed',
      );
    }

    return {
      providerUserId: decoded.uid,
      phoneNumber: decoded.phone_number,
    };
  }
}
