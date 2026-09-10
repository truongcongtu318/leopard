import { describe, expect, it } from '@jest/globals';

import { parseSignatureInput } from './driver-signature.js';

/** Minimal valid 1x1 PNG (magic bytes + IHDR start). */
const ONE_PIXEL_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
  'base64',
);

function toPngDataUri(buffer: Buffer): string {
  return `data:image/png;base64,${buffer.toString('base64')}`;
}

describe('parseSignatureInput', () => {
  it('falls back to the applicant name when no signature is provided', () => {
    const result = parseSignatureInput(undefined, 'Nguyễn Văn A');

    expect(result).toEqual({ kind: 'typed', signedByName: 'Nguyễn Văn A' });
  });

  it('accepts a trimmed typed signature under the 120-character limit', () => {
    const result = parseSignatureInput('  Trần Văn Linh  ', 'fallback');

    expect(result).toEqual({ kind: 'typed', signedByName: 'Trần Văn Linh' });
  });

  it('rejects an empty (whitespace-only) typed signature', () => {
    expect(() => parseSignatureInput('   ', 'fallback')).toThrow(
      expect.objectContaining({ code: 'SIGNATURE_INVALID' }),
    );
  });

  it('rejects a typed signature longer than 120 characters', () => {
    const tooLong = 'a'.repeat(121);

    expect(() => parseSignatureInput(tooLong, 'fallback')).toThrow(
      expect.objectContaining({ code: 'SIGNATURE_INVALID' }),
    );
  });

  it('accepts a valid PNG data URI, sniffed by magic bytes rather than the declared header', () => {
    const result = parseSignatureInput(toPngDataUri(ONE_PIXEL_PNG), 'Nguyễn Văn A');

    expect(result.kind).toBe('image');
    if (result.kind === 'image') {
      expect(result.mime).toBe('image/png');
      expect(result.ext).toBe('png');
      expect(result.signedByName).toBe('Nguyễn Văn A');
      expect(result.buffer.equals(ONE_PIXEL_PNG)).toBe(true);
    }
  });

  it('rejects a data URI whose declared MIME lies about the actual bytes', () => {
    const notActuallyAnImage = Buffer.from('this is definitely not an image');
    const dataUri = `data:image/png;base64,${notActuallyAnImage.toString('base64')}`;

    expect(() => parseSignatureInput(dataUri, 'fallback')).toThrow(
      expect.objectContaining({ code: 'SIGNATURE_INVALID' }),
    );
  });

  it('rejects a data URI with an unsupported (but real) image type', () => {
    // GIF magic bytes ("GIF89a") — not in the allow-list (jpeg/png/webp).
    const gifBytes = Buffer.from('GIF89a-not-a-real-gif-but-has-the-header');
    const dataUri = `data:image/gif;base64,${gifBytes.toString('base64')}`;

    expect(() => parseSignatureInput(dataUri, 'fallback')).toThrow(
      expect.objectContaining({ code: 'SIGNATURE_INVALID' }),
    );
  });

  it('rejects a data URI exceeding the 10MB image size limit', () => {
    const oversized = Buffer.alloc(10 * 1024 * 1024 + 1024);
    oversized[0] = 0x89;
    oversized[1] = 0x50;
    oversized[2] = 0x4e;
    oversized[3] = 0x47;
    const dataUri = `data:image/png;base64,${oversized.toString('base64')}`;

    expect(() => parseSignatureInput(dataUri, 'fallback')).toThrow(
      expect.objectContaining({ code: 'SIGNATURE_INVALID' }),
    );
  });

  it('rejects a data URI with a non-base64 payload', () => {
    const dataUri = 'data:image/png;base64,not-valid-base64!!!';

    expect(() => parseSignatureInput(dataUri, 'fallback')).toThrow(
      expect.objectContaining({ code: 'SIGNATURE_INVALID' }),
    );
  });

  it('rejects a malformed data URI (missing the base64 comma payload marker)', () => {
    expect(() => parseSignatureInput('data:image/png', 'fallback')).toThrow(
      expect.objectContaining({ code: 'SIGNATURE_INVALID' }),
    );
  });

  it('rejects an empty data URI payload', () => {
    expect(() => parseSignatureInput('data:image/png;base64,', 'fallback')).toThrow(
      expect.objectContaining({ code: 'SIGNATURE_INVALID' }),
    );
  });
});
