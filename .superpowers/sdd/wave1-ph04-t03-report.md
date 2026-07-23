# PH-04-T03: Web Design System — Implementation Report

**State**: IN_REVIEW
**Date**: 2026-07-23
**Agent B — Client Foundations**

## Summary

Created the LEOPARD operations web design system in `packages/ui/`. All 7 components, design tokens, barrel export, and 55 tests pass with TypeScript typecheck clean.

## Files Created

| File | Purpose |
|------|---------|
| `packages/ui/src/tokens.css` | Tailwind CSS 4 `@theme` tokens (colors, spacing, radius, font) |
| `packages/ui/src/cn.ts` | `clsx` + `tailwind-merge` utility |
| `packages/ui/src/Button.tsx` | Button with variants (primary/secondary/destructive/ghost), sizes (sm/md/lg), loading, disabled, forwardRef |
| `packages/ui/src/StatusBadge.tsx` | Maps 14 statuses to semantic color badges |
| `packages/ui/src/DataTable.tsx` | Controlled data table with sortable headers, loading skeleton, empty state |
| `packages/ui/src/Pagination.tsx` | Controlled pagination with ellipsis, Previous/Next, screen reader text |
| `packages/ui/src/FilterBar.tsx` | Debounced search input + status dropdown + clear button |
| `packages/ui/src/ScreenState.tsx` | Loading/empty/error/success state handler |
| `packages/ui/src/MapPanel.tsx` | Placeholder map component |
| `packages/ui/src/index.ts` | Barrel export of all components and types |
| `packages/ui/src/components.test.tsx` | 55 tests covering all components |

## Config Files

| File | Purpose |
|------|---------|
| `packages/ui/tsconfig.json` | Extends `@leopard/config/tsconfig/nextjs.json`, excludes test files |
| `packages/ui/jest.config.js` | SWC transform, jsdom, CSS mock |
| `packages/ui/src/__mocks__/styleMock.js` | CSS module mock for Jest |

## Dependency Changes

Added to `packages/ui/package.json` `devDependencies`:
- `@swc/core` (for Jest transform)
- `@swc/jest` (for Jest transform)

## Design Token Compliance

Colors match mobile `apps/mobile/src/theme/tokens.ts`:
- brand, info, warning, active, success, danger, neutral with background/text/border variants
- Spacing: 4/8/12/16/24/32 steps
- Radius: 6px control, 6px card
- Font: Inter, system-ui, sans-serif stack

## Component Feature Matrix

| Feature | Button | StatusBadge | DataTable | Pagination | FilterBar | ScreenState | MapPanel |
|---------|--------|-------------|-----------|------------|-----------|-------------|----------|
| Variants | 4 | 5 colors | sortable | ellipsis | search+status | 4 states | — |
| Sizes | sm/md/lg | — | responsive | — | responsive | — | height |
| Loading | spinner | — | skeleton | — | — | spinner | — |
| Empty | — | — | message | — | — | icon+msg | — |
| Error | — | — | — | — | — | icon+msg+retry | — |
| A11y | aria-busy/disabled | — | table role | sr-only | labels | labels | — |
| Controlled | onPress | — | onSort | onPageChange | onFilterChange | — | — |
| Minimum touch | 44px | — | — | — | — | — | — |
| forwardRef | Yes | No | No | No | No | No | No |

## Test Results

```
Test Suites: 1 passed, 1 total
Tests:       55 passed, 55 total
```

### Test Breakdown
- **Button**: 13 tests — variants, sizes, onClick, disabled, loading, aria attributes, forwardRef, className merging
- **StatusBadge**: 15 tests — 14 status color mappings + custom className
- **DataTable**: 8 tests — headers, rows, loading skeleton, empty message, onSort, non-sortable, table role, custom render
- **Pagination**: 7 tests — page numbers, Previous/Next disabled at boundaries, onPageChange, screen reader text
- **FilterBar**: 5 tests — input/dropdown rendering, clear button, debounced search, immediate status change, clear action
- **ScreenState**: 4 tests — loading/empty/error/success states
- **MapPanel**: 3 tests — placeholder text, default/custom height

## Gates

- **RED**: Confirmed — tests ran with `Cannot find module` errors before components existed
- **GREEN**: `pnpm --filter @leopard/ui test` — 55 passed, exit 0
- **GREEN**: `pnpm --filter @leopard/ui typecheck` — clean, exit 0
