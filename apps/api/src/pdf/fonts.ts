import { fileURLToPath } from 'node:url';

/**
 * Vietnamese-safe embedded font strategy: pdfkit's built-in AFM fonts
 * (Helvetica, Times, etc.) use WinAnsi/MacRoman encoding and cannot render
 * Vietnamese diacritics (e.g. "ệ", "ữ", "ẫ"). We embed a real Unicode TTF
 * (Roboto, Apache-2.0, full Vietnamese subset) instead so every rendered
 * PDF is legible regardless of the deployment locale.
 *
 * Paths are resolved relative to this compiled file so they work both from
 * ts-jest (running against src/) and from the built dist/ output — see
 * apps/api/scripts/copy-pdf-assets.mjs, which copies ./assets next to the
 * compiled dist/pdf/fonts.js at build time.
 */
export const PDF_FONT_REGULAR_PATH = fileURLToPath(
  new URL('./assets/fonts/Roboto-Regular.ttf', import.meta.url),
);

export const PDF_FONT_BOLD_PATH = fileURLToPath(
  new URL('./assets/fonts/Roboto-Bold.ttf', import.meta.url),
);
