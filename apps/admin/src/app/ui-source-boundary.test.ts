import { describe, expect, it } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('Operations Web Tailwind source boundary', () => {
  it('scans shared UI primitives so responsive and semantic classes are emitted', () => {
    const stylesheet = readFileSync(join(process.cwd(), 'src/app/globals.css'), 'utf8');

    expect(stylesheet).toContain('@source "../../../../packages/ui/src";');
  });
});
