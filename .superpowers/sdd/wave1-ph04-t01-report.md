# PH-04-T01: Next.js Runtime Shell -- Report

- **Task ID**: PH-04-T01
- **State**: IN_REVIEW
- **Agent**: B -- Client Foundations
- **Date**: 2026-07-23

## Summary

Created a minimal Next.js 16 App Router shell for the LEOPARD admin web app (`apps/admin`). The root page redirects unauthenticated users to `/login`, metadata is configured for Vietnamese locale, and globals.css imports Tailwind CSS 4.

## Owned Files

| File | Purpose |
|------|---------|
| `apps/admin/package.json` | Removed duplicate `jest` config field, added `@types/jest` devDep and `typescript` devDep |
| `apps/admin/tsconfig.json` | Added `"types": ["jest"]` and CSS type declarations include |
| `apps/admin/next.config.mjs` | Renamed from `.ts` to `.mjs` due to TS7/Next16 SWC transpilation incompatibility; set `ignoreBuildErrors: true` (typecheck handled separately) |
| `apps/admin/postcss.config.mjs` | Tailwind CSS 4 PostCSS configuration |
| `apps/admin/jest.config.js` | Next.js SWC-based Jest transform via `next/jest` |
| `apps/admin/src/types/css.d.ts` | CSS module type declarations |
| `apps/admin/src/app/globals.css` | Tailwind CSS 4 import with CSS reset |
| `apps/admin/src/app/layout.tsx` | Root layout: `lang="vi"`, metadata, viewport, Inter font, globals.css import |
| `apps/admin/src/app/page.tsx` | Root page: redirects to `/login` |
| `apps/admin/src/app/page.test.tsx` | Tests: verify redirect throws NEXT_REDIRECT and target is `/login` |

## RED Evidence

- `pnpm --filter web --fail-if-no-match test` failed because no test file existed (exit 1).
- Also discovered `next.config.ts` was incompatible with TS7/Next16 SWC transpilation -- the `.ts` config caused SWC bindings failures. Renamed to `.mjs`.

## GREEN Evidence

All three gates pass exit 0:

```
pnpm --filter web --fail-if-no-match test        # 2 tests pass
pnpm --filter web --fail-if-no-match typecheck    # tsc --noEmit passes
pnpm --filter web --fail-if-no-match build        # Next.js build produces static / and /_not-found
```

## Design Decisions

1. **`next.config.mjs` instead of `.ts`**: TypeScript 7's `ts.sys` API is incompatible with Next.js 16's SWC-based config transpilation. Converted to plain `.mjs`.
2. **`ignoreBuildErrors: true`**: The Next.js 16 build worker crashes with TS7. We use the separate `typecheck` script for type validation.
3. **Error-based redirect testing**: `next/navigation`'s `redirect()` throws a `NEXT_REDIRECT` error. Tests catch this error and verify the `digest` field contains the target URL.
4. **No `jest` field in package.json**: The `jest` field conflicts with `jest.config.js` when using `next/jest`. Moved all config to the JS file.

## Out of Scope

No lockfile, Git, API, mobile, or shared package changes. All changes are under `apps/admin/**`.
