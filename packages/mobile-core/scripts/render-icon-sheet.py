#!/usr/bin/env python3
"""Render the LEOPARD icon set to an SVG sprite for visual review.

Reads the actual source, applies the *shipped* defaults (filled=false, per-icon
stroke), forces a uniform frame and tint so shapes can be compared, and writes
/tmp/icons_review.svg. Convert with:
    rsvg-convert -w 1160 -b white /tmp/icons_review.svg -o /tmp/icons_review.png
"""
import re
import html
import json
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
TILE, COLS, LABEL, GAP = 64, 8, 20, 24
CELL_W, CELL_H = 136, TILE + LABEL + GAP
NEUTRAL = '#0F172A'
EXPR = re.compile(r'\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}')


def kebab(s):
    return re.sub(r'([a-z0-9])([A-Z])', r'\1-\2', s).lower()


def resolve(jsx, color, stroke):
    def rep(m):
        e = m.group(1).strip()
        if e in ('s', 'size', 'resolvedSize'):
            return str(TILE)
        if e in ('sw', 'strokeWidth', 'resolvedStrokeWidth'):
            return str(stroke)
        if e == 'secondaryColor':
            return '#E2E8F0'
        if 'Fill' in e:
            return 'none'          # filled = false is the shipped default
        if '?' in e:
            return ''
        return color
    prev = None
    while prev != jsx:
        prev = jsx
        jsx = EXPR.sub(rep, jsx)
    return jsx


def tidy(jsx, color, stroke):
    jsx = re.sub(r'\s*(testID|style|data-testid)=\{[^}]*\}', '', jsx, flags=re.S)
    jsx = re.sub(r'\s*data-testid="[^"]*"', '', jsx)
    jsx = re.sub(r'\{filled \?[^{}]*(?:\{[^{}]*\}[^{}]*)*\}', '', jsx)
    jsx = resolve(jsx, color, stroke)
    for a in ['strokeWidth', 'strokeLinecap', 'strokeLinejoin', 'strokeDasharray',
              'strokeOpacity', 'fillOpacity', 'fillRule', 'clipRule']:
        jsx = jsx.replace(a + '=', kebab(a) + '=')
    jsx = re.sub(r'\b(Svg|Circle|Path|Rect|Line|Polygon|Polyline|G|Defs'
                 r'|LinearGradient|RadialGradient|Stop)\b',
                 lambda m: m.group(1).lower(), jsx)
    jsx = re.sub(r'\b([a-zA-Z][\w:-]*)=([^\s"\'>/]+)', r'\1="\2"', jsx)

    def root(m):
        t = re.sub(r'\s(width|height|fill)="[^"]*"', '', m.group(0))
        return t[:-1].rstrip() + f' width="{TILE}" height="{TILE}" fill="none">'
    return re.sub(r'<svg\b[^>]*>', root, jsx, count=1)


def defaults(head):
    cm = re.search(r"color = '(#[0-9A-Fa-f]{6})'", head)
    color = cm.group(1) if cm else NEUTRAL
    sm = re.search(r'strokeWidth = (?:iconStroke\.(\w+)|([\d.]+))', head)
    stroke = 1.75
    if sm:
        stroke = ({'regular': 1.5, 'medium': 1.75, 'bold': 2}.get(sm.group(1))
                  if sm.group(1) else float(sm.group(2)))
    return color, stroke


def collect(path, marker):
    out, src = [], open(path).read()
    for m in re.finditer(r'export function (\w+)\(\{', src):
        name = m.group(1)
        end = src.find('\nexport function', m.end())
        body = src[m.end(): end if end != -1 else len(src)]
        head = body[:body.find(marker)] if marker in body else body[:400]
        color, stroke = defaults(head)
        w = re.search(r'if \(Platform\.OS === .web.\) \{\s*return \((.*?)\);\s*\}', body, re.S)
        if w:
            out.append((name, tidy(w.group(1), color, stroke)))
            continue
        r = re.search(r'return \(\s*(<Svg.*?</Svg>)\s*\);', body, re.S)
        if r:
            out.append((name, tidy(r.group(1), color, stroke)))
    return out


def main():
    tiles = (collect(f'{ROOT}/packages/mobile-core/src/ui/icons/CoreIcons.tsx',
                     '}: VectorIconProps')
             + collect(f'{ROOT}/packages/mobile-core/src/icons/svg-icons.tsx', '}: Icon'))

    def tint(m):
        v = m.group(2).upper()
        keep = ('#FFFFFF', '#E2E8F0', '#F0F4F9', '#F8FAFC', 'NONE')
        return m.group(0) if v in keep else f'{m.group(1)}="{NEUTRAL}"'
    tiles = [(n, re.sub(r'(stroke|fill)="(#[0-9A-Fa-f]{3,6}|none)"', tint, j)) for n, j in tiles]

    rows = (len(tiles) + COLS - 1) // COLS
    w, h = COLS * CELL_W, rows * CELL_H + 44
    out = [f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" '
           f'viewBox="0 0 {w} {h}">',
           f'<rect width="{w}" height="{h}" fill="#ffffff"/>',
           f'<text x="12" y="26" font-family="monospace" font-size="17" fill="#0F172A">'
           f'LEOPARD icons - {len(tiles)} @ {TILE}px, shipped defaults</text>']
    for i, (name, jsx) in enumerate(tiles):
        r, c = divmod(i, COLS)
        x, y = c * CELL_W + (CELL_W - TILE) // 2, r * CELL_H + 44
        out.append(f'<g transform="translate({x},{y})">{jsx}</g>')
        out.append(f'<text x="{c * CELL_W + CELL_W / 2}" y="{y + TILE + 15}" '
                   f'text-anchor="middle" font-family="monospace" font-size="10.5" '
                   f'fill="#334155">{html.escape(name)}</text>')
    out.append('</svg>')
    open('/tmp/icons_review.svg', 'w').write('\n'.join(out))
    print(json.dumps({'tiles': len(tiles), 'svg': '/tmp/icons_review.svg'}))


if __name__ == '__main__':
    sys.exit(main())
