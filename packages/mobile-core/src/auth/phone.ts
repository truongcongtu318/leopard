/**
 * Normalizes a Vietnamese phone number to E.164 (+84...) for Firebase Phone Auth.
 * Accepts:
 * - Local 10-digit: `0900000001` or `090 000 0001` -> `+84900000001`
 * - Local 9-digit: `900000001` or `900 000 001` -> `+84900000001`
 * - Standard E.164: `+84900000001` or `+84 900 000 001` -> `+84900000001`
 * - Accidental double prefix: `+840900000001` or `840900000001` -> `+84900000001`
 * - Country code without plus: `84900000001` -> `+84900000001`
 */
export function toE164Vn(input: string): string {
  let cleaned = input.trim().replace(/[\s.()\-+]/g, '');

  // Strip leading 84 if present
  if (cleaned.startsWith('84') && cleaned.length >= 11) {
    cleaned = cleaned.slice(2);
  }

  // Strip leading 0 if present (e.g. 0900000001 -> 900000001)
  if (cleaned.startsWith('0')) {
    cleaned = cleaned.slice(1);
  }

  return `+84${cleaned}`;
}

/** True when the input looks like a plausible VN mobile number (9 digits after +84). */
export function isLikelyVnPhone(input: string): boolean {
  const e164 = toE164Vn(input);
  return /^\+84\d{9}$/.test(e164);
}

