# PH-04-T01A: Prepare Operations Web Manifests

## State: READY

## Task ID
PH-04-T01A

## Goal
Create package.json and config files for the admin web app and UI package.

## Agent
Agent B -- Client Foundations

## Files Created

### 1. `packages/ui/package.json`
- Name: `@leopard/ui`
- Version: `0.0.0`, private
- Main/types: `./src/index.ts`
- Scripts: `test`, `lint`, `typecheck`
- Peer dependencies: `next>=16.0.0`, `react>=19.0.0`, `react-dom>=19.0.0`
- Direct dependencies: `clsx 2.1.1`, `tailwind-merge 3.4.0`
- Dev dependencies: `@leopard/config` (workspace), `@jest/globals`, `@testing-library/jest-dom`, `@testing-library/react`, `@types/react`, `jest`, `jest-environment-jsdom`, `tailwindcss`
- Jest config: `jsdom` test environment

### 2. `apps/admin/package.json`
- Name: `web`
- Version: `0.0.0`, private
- Scripts: `dev` (port 3002), `build`, `start`, `test`, `test:e2e`, `lint`, `typecheck`
- Dependencies: `@leopard/ui` (workspace), `next 16.0.8`, `react 19.2.7`, `react-dom 19.2.7`
- Dev dependencies: `@leopard/config` (workspace), `@jest/globals`, `@playwright/test`, `@testing-library/jest-dom`, `@testing-library/react`, `@types/react`, `@types/react-dom`, `jest`, `jest-environment-jsdom`, `tailwindcss 4.1.18`, `@tailwindcss/postcss 4.1.18`
- Jest config: `jsdom` test environment, ignores `/e2e/`

### 3. `apps/admin/next.config.ts`
- Next.js 16 config with TypeScript
- `output: 'standalone'` for Docker deployment
- `reactStrictMode: true`
- `transpilePackages: ['@leopard/ui']`
- `ignoreBuildErrors: false` (type-checking enforced)

### 4. `apps/admin/tsconfig.json`
- Extends `@leopard/config/tsconfig/nextjs.json`
- `noEmit: true`
- Includes: `src/**/*.ts`, `src/**/*.tsx`
- Excludes: `node_modules`

## Verification
- No lockfile changes (pnpm-lock.yaml untouched)
- No Git operations performed
- No node_modules created
- No out-of-scope files modified (only `apps/admin/**` and `packages/ui/**`)
- All package names and versions match the task contract exactly
- Workspace protocol (`workspace:*`) used for internal dependencies
