import {
  GoogleAuthProvider,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  signInWithPopup,
  type ConfirmationResult,
} from 'firebase/auth';

import { getFirebaseAuth } from './firebase';
import { toE164Vn } from './phone';

/** An in-progress phone verification: confirm the SMS code to get a Firebase idToken. */
export interface OtpChallenge {
  confirm(code: string): Promise<string>;
}

let recaptchaVerifier: RecaptchaVerifier | null = null;

/**
 * Web Phone Auth requires a reCAPTCHA. We use an invisible verifier bound to a
 * DOM element rendered by the login screen (via <View nativeID={containerId} />).
 */
function getRecaptchaVerifier(containerId: string): RecaptchaVerifier {
  if (!recaptchaVerifier) {
    recaptchaVerifier = new RecaptchaVerifier(getFirebaseAuth(), containerId, {
      size: 'invisible',
    });
  }
  return recaptchaVerifier;
}

export async function sendPhoneOtp(
  rawPhone: string,
  recaptchaContainerId: string,
): Promise<OtpChallenge> {
  const auth = getFirebaseAuth();
  const verifier = getRecaptchaVerifier(recaptchaContainerId);
  const confirmation: ConfirmationResult = await signInWithPhoneNumber(
    auth,
    toE164Vn(rawPhone),
    verifier,
  );

  return {
    async confirm(code: string): Promise<string> {
      const credential = await confirmation.confirm(code);
      return credential.user.getIdToken();
    },
  };
}

export async function signInWithGoogle(): Promise<string> {
  const auth = getFirebaseAuth();
  const credential = await signInWithPopup(auth, new GoogleAuthProvider());
  return credential.user.getIdToken();
}

/** Clears the cached reCAPTCHA verifier (e.g. after an error, to allow a retry). */
export function resetRecaptcha(): void {
  if (recaptchaVerifier) {
    recaptchaVerifier.clear();
    recaptchaVerifier = null;
  }
}
