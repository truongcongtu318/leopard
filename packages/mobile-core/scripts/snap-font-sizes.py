#!/usr/bin/env python3
"""Snap every hardcoded fontSize onto the HIG type ramp.

The ramp is the set of sizes Apple publishes for iOS text styles. Any value off
it is drift: no HIG style is 10.5pt, nothing readable sits below Caption 2, and
12.5pt is not a step. This rewrites the *value* only and leaves lineHeight and
fontWeight alone, so the visual delta is the size step and nothing else.

Exempt: fontSize: 1 (text hidden from screen readers) and sizes above largeTitle
(34), which are hero/illustration numbers rather than text styles.

Usage: snap-font-sizes.py <root> [--apply]
"""
import os
import re
import sys

# Owned by a concurrent session; touching these would collide.
EXCLUDE = ('features/orders/', 'ProfileScreen.tsx')

RAMP = [11, 12, 13, 15, 16, 17, 20, 22, 28, 34]
STYLE_FOR = {11: 'caption2', 12: 'caption1', 13: 'footnote', 15: 'subheadline',
             16: 'callout', 17: 'body', 20: 'title3', 22: 'title2',
             28: 'title1', 34: 'largeTitle'}

# Sizes that are deliberately off the text ramp and must keep their value.
EXEMPT_EXACT = {1}

# Decorative lettering drawn on an illustration, not text a user reads.
# Keyed by file basename -> the style keys that are exempt.
EXEMPT_STYLES = {
    'TruckLoader.tsx': {'cargoBrandText'},
    'CoreIcons.tsx': {'phoneFloatingBadgeText'},
    # Promotional artwork: the lettering is drawn as part of the illustration.
    'HomePromoArtwork.tsx': {'eyebrow', 'brand'},
}


def enclosing_style_key(src, index):
    """The `styleName: {` key that owns the fontSize at `index`."""
    head = src[:index]
    keys = list(re.finditer(r'^\s{2}(\w+):\s*\{', head, re.M))
    return keys[-1].group(1) if keys else None


def snap(value: float) -> int:
    if value <= RAMP[0]:
        return RAMP[0]
    return min(RAMP, key=lambda step: (abs(step - value), -step))


def process(path, apply):
    # The token module *defines* the ramp; rewriting it would make it reference
    # itself.
    if os.path.basename(path) == 'tokens.ts' and os.path.basename(
            os.path.dirname(path)) == 'theme':
        return []
    src = open(path).read()
    changes = []

    def repl(m):
        raw = m.group(1)
        value = float(raw)
        if value in EXEMPT_EXACT or value > RAMP[-1]:
            return m.group(0)
        skip = EXEMPT_STYLES.get(os.path.basename(path), set())
        if enclosing_style_key(src, m.start()) in skip:
            return m.group(0)
        target = snap(value)
        if value == target:
            return m.group(0)
        changes.append((raw, target))
        return f'fontSize: typeScale.{STYLE_FOR[target]}.fontSize'

    out = re.sub(r'fontSize: *(\d+\.?\d*)', repl, src)
    if not changes:
        return []

    # make sure typeScale is in scope
    if 'typeScale' not in src.split('fontSize')[0] or not re.search(
            r'import[^;]*\btypeScale\b[^;]*from .@leopard/mobile-core.', out, re.S):
        m = re.search(r"import\s*\{([^}]*)\}\s*from '@leopard/mobile-core';", out, re.S)
        if m:
            names = m.group(1).rstrip()
            if not names.endswith(','):
                names += ','
            if '\n' in names:
                out = out[:m.start(1)] + names + '\n  typeScale,\n' + out[m.end(1):]
            else:
                out = out[:m.start(1)] + ' typeScale,' + m.group(1) + out[m.end(1):]
        else:
            src_import = open(path).read()
            if "@leopard/mobile-core" in src_import:
                out = re.sub(r"(import[^;]*from '@leopard/mobile-core';)",
                             r"import { typeScale } from '@leopard/mobile-core';\n\1", out, count=1)
            else:
                out = "import { typeScale } from '@leopard/mobile-core';\n" + out

    if apply:
        open(path, 'w').write(out)
    return changes


def main():
    root = sys.argv[1]
    apply = '--apply' in sys.argv
    total = 0
    per_file = []
    for base, _, files in os.walk(root):
        if 'node_modules' in base or '/dist' in base or '/.next' in base:
            continue
        for f in files:
            if not f.endswith(('.tsx', '.ts')) or f.endswith(('.test.tsx', '.test.ts')):
                continue
            p = os.path.join(base, f)
            if any(x in p for x in EXCLUDE):
                continue
            ch = process(p, apply)
            if ch:
                per_file.append((len(ch), p, ch))
                total += len(ch)
    per_file.sort(reverse=True)
    for n, p, ch in per_file:
        summary = ', '.join(f'{a}->{b}' for a, b in sorted(set(ch)))
        print(f'{n:4d}  {p}\n        {summary}')
    print(f'\n{"APPLIED" if apply else "DRY RUN"}: {total} values in {len(per_file)} files')


if __name__ == '__main__':
    main()
