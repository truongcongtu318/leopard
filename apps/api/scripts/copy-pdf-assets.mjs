import console from 'node:console';
import { cp } from 'node:fs/promises';
import process from 'node:process';
import { fileURLToPath, pathToFileURL, URL } from 'node:url';

// PdfService loads its embedded Vietnamese-safe fonts from a path relative to
// its own compiled location (see apps/api/src/pdf/fonts.ts), so the raw font
// files under src/pdf/assets must be copied next to the compiled dist output.
// tsc only emits .ts sources; it does not copy non-TypeScript assets.
const sourceDirectory = fileURLToPath(new URL('../src/pdf/assets', import.meta.url));
const destinationDirectory = fileURLToPath(new URL('../dist/pdf/assets', import.meta.url));

export async function copyPdfAssets() {
  await cp(sourceDirectory, destinationDirectory, { recursive: true });
}

const entryPath = process.argv[1];
if (entryPath && import.meta.url === pathToFileURL(entryPath).href) {
  copyPdfAssets().catch((error) => {
    console.error('[api:build] failed to copy PDF assets', error);
    process.exit(1);
  });
}
