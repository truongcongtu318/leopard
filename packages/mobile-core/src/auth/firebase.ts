import { getApp, getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';

/**
 * Firebase Web app config. These values are public (they ship in the client
 * bundle by design) and are read from EXPO_PUBLIC_* env at build time.
 * See docs/development/07-firebase-auth-setup.md.
 */
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

export function isFirebaseConfigured(): boolean {
  return Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);
}

/**
 * Exposes the (public, client-safe) Firebase Web config so feature code
 * that needs it outside of `firebase/app` — e.g. passing it to a static
 * `public/firebase-messaging-sw.js` service worker via URL query params,
 * since that file is not processed by Metro's env inlining — doesn't have
 * to duplicate the `process.env.EXPO_PUBLIC_FIREBASE_*` reads.
 */
export function getFirebaseWebConfig(): Readonly<typeof firebaseConfig> {
  return firebaseConfig;
}

export function getFirebaseApp(): FirebaseApp {
  return getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
}

let authInstance: Auth | null = null;

export function getFirebaseAuth(): Auth {
  if (!authInstance) {
    authInstance = getAuth(getFirebaseApp());

    // In development, disable reCAPTCHA app verification so that Firebase
    // test phone numbers (configured in Firebase Console) can be used without
    // a working reCAPTCHA.  This is the official Firebase mechanism for testing:
    // https://firebase.google.com/docs/auth/web/phone-auth#test-with-whitelisted-phone-numbers
    if (process.env.NODE_ENV !== 'production') {
      authInstance.settings.appVerificationDisabledForTesting = true;
    }
  }
  return authInstance;
}
