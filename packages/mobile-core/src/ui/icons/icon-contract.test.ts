import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from '@jest/globals';

/**
 * Source-level guards for the icon contract.
 *
 * These catch drift that a render test cannot: an icon whose default colour is
 * invisible, or a stroke width typed as a literal instead of going through the
 * token, both look fine in isolation and wrong in a screen.
 */
const CORE = readFileSync(join(__dirname, 'CoreIcons.tsx'), 'utf8');
const LEGACY = readFileSync(join(__dirname, '../../icons/svg-icons.tsx'), 'utf8');
const ALL = `${CORE}\n${LEGACY}`;

describe('icon contract', () => {
  it('never defaults an icon to a colour that is invisible on a light surface', () => {
    const whiteDefaults = ALL.match(/color = '#FFFFFF'/g) ?? [];
    expect(whiteDefaults).toEqual([]);
  });

  it('routes every stroke through the token instead of a literal', () => {
    // A literal here means the icon ignores strokeWidth entirely, so it keeps a
    // weight the rest of the set does not have.
    expect(ALL.match(/strokeWidth="[\d.]+"/g) ?? []).toEqual([]);
  });

  it('resolves size and stroke from the shared contract', () => {
    const components = CORE.match(/export function \w+\(\{/g) ?? [];
    const resolvers = CORE.match(/resolveIconSize\(size\)/g) ?? [];
    // every component that draws must resolve its size
    expect(resolvers.length).toBeGreaterThanOrEqual(components.length - 8);
  });

  it('keeps one drawing per metaphor', () => {
    // The shield-with-alert metaphor used to exist twice.
    expect(ALL.match(/export function IconWarningShield/g) ?? []).toEqual([]);
    expect(ALL).toContain('export const IconWarningShield = IconShieldAlert');
  });

  it('does not draw a currency glyph for a VND-only product', () => {
    // IconEarnings used to be a US dollar sign.
    expect(ALL).not.toContain('M17 5H9.5C8.57174');
  });
});
