import { DomainError } from '../common/domain-error.js';
import {
  IMAGE_MIME_TO_EXT,
  MAX_IMAGE_SIZE_BYTES,
  detectImageMime,
  isAllowedImageMime,
} from '../media/image-validation.js';

/**
 * Parses the `signature` field of `ApplyDriverDto` at the trust boundary.
 *
 * The field is either:
 *  - absent — the applicant's typed name (`fallbackSignedByName`) stands in
 *    for the signature;
 *  - a plain, non-empty string ≤120 chars — a typed signature, used verbatim
 *    as `signedByName` (matches `DriverContract.signedByName`'s VarChar(120));
 *  - a `data:` URI — an actual signature image. The declared MIME in the URI
 *    header is never trusted: bytes are decoded, size-bounded, then sniffed
 *    via magic-byte detection (mirrors `driver-document.service.ts`).
 *
 * Any malformed/oversized/undecodable/disallowed input throws
 * `SIGNATURE_INVALID` (422) — never a generic validation error, so the
 * caller can surface a specific Vietnamese message.
 */

const MAX_TYPED_SIGNATURE_LENGTH = 120;

// Matches `data:[<mime>];base64,<payload>`. The mime group is intentionally
// unused for trust decisions — only ";base64" tells us the payload is
// base64 (a bare data URI without it would be URL-encoded text, not binary).
const DATA_URI_PATTERN = /^data:([a-zA-Z0-9.+-]+\/[a-zA-Z0-9.+-]+)?;base64,(.*)$/s;
const BASE64_CHARSET_PATTERN = /^[A-Za-z0-9+/]*={0,2}$/;
// Generous upper bound on the *encoded* payload so an oversized string is
// rejected before any decode/allocation is attempted.
const MAX_BASE64_PAYLOAD_LENGTH = Math.ceil((MAX_IMAGE_SIZE_BYTES * 4) / 3) + 8;

export interface ParsedTypedSignature {
  readonly kind: 'typed';
  readonly signedByName: string;
}

export interface ParsedImageSignature {
  readonly kind: 'image';
  readonly signedByName: string;
  readonly buffer: Buffer;
  readonly mime: string;
  readonly ext: string;
}

export type ParsedSignature = ParsedTypedSignature | ParsedImageSignature;

function invalidSignature(): never {
  throw new DomainError('SIGNATURE_INVALID', 422, 'Chữ ký không hợp lệ');
}

export function parseSignatureInput(
  signature: string | undefined,
  fallbackSignedByName: string,
): ParsedSignature {
  if (signature === undefined) {
    return { kind: 'typed', signedByName: fallbackSignedByName };
  }

  if (!signature.startsWith('data:')) {
    return parseTypedSignature(signature);
  }

  return parseImageSignature(signature, fallbackSignedByName);
}

function parseTypedSignature(signature: string): ParsedTypedSignature {
  const trimmed = signature.trim();

  if (trimmed.length === 0 || trimmed.length > MAX_TYPED_SIGNATURE_LENGTH) {
    invalidSignature();
  }

  return { kind: 'typed', signedByName: trimmed };
}

function parseImageSignature(
  dataUri: string,
  signedByName: string,
): ParsedImageSignature {
  const match = DATA_URI_PATTERN.exec(dataUri);
  const base64Payload = match?.[2];
  if (typeof base64Payload !== 'string') {
    invalidSignature();
  }

  if (
    base64Payload.length === 0 ||
    base64Payload.length > MAX_BASE64_PAYLOAD_LENGTH ||
    !BASE64_CHARSET_PATTERN.test(base64Payload)
  ) {
    invalidSignature();
  }

  const buffer = Buffer.from(base64Payload, 'base64');
  if (buffer.length === 0 || buffer.length > MAX_IMAGE_SIZE_BYTES) {
    invalidSignature();
  }

  const mime = detectImageMime(buffer);
  if (!mime || !isAllowedImageMime(mime)) {
    invalidSignature();
  }

  const ext = IMAGE_MIME_TO_EXT[mime];
  if (ext === undefined) {
    invalidSignature();
  }

  // The image itself is the evidence; signedByName carries the applicant's
  // own (already-validated) name for the printed party fields.
  return { kind: 'image', signedByName, buffer, mime, ext };
}
