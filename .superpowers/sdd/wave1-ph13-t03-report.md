# PH-13-T03: CI Matrix and Supply Chain Gate -- Report

**State:** IN_REVIEW
**Date:** 2026-07-23

## Summary

Implemented CI/CD foundation for the LEOPARD monorepo: GitHub Actions CI workflow, security scanning workflow, Dependabot configuration, and a local CI verifier script.

## Files Created/Modified

### Owned Paths (in-scope)
| File | Action | Purpose |
|---|---|---|
| `.github/workflows/ci.yml` | Created | Multi-job CI pipeline (lint, typecheck, unit-test, integration-test, build) |
| `.github/workflows/security.yml` | Created | Weekly security scanning (CodeQL, dependency review, secret scan) |
| `.github/dependabot.yml` | Created | Automated dependency updates for npm and GitHub Actions |
| `scripts/verify-ci.mjs` | Created | Local CI configuration validator (no extra deps required) |

### Pre-existing Fixes (required for GREEN gates)
| File | Action | Purpose |
|---|---|---|
| `packages/ui/eslint.config.mjs` | Created | Missing ESLint flat config for @leopard/ui package |
| `apps/admin/eslint.config.mjs` | Created | Missing ESLint flat config for admin/web package |
| `packages/ui/src/__mocks__/styleMock.js` | Fixed | Added `/* global module */` for ESLint compliance |
| `packages/config/eslint/base.mjs` | Fixed | Added `.next/`, `.expo/`, `jest.config.js` to ignores |
| `apps/api/jest.config.cjs` | Fixed | Added `testPathIgnorePatterns` to exclude DB-dependent tests from unit runs |

## RED State Verification

```
$ node scripts/verify-ci.mjs
[FAIL] .github/workflows/security.yml is missing
[FAIL] .github/dependabot.yml is missing
CI configuration verification FAILED.
Exit: 1
```

## GREEN State Verification

All gates pass with exit code 0:

```
verify-ci.mjs  EXIT: 0
pnpm lint       EXIT: 0
pnpm typecheck  EXIT: 0
pnpm test       EXIT: 0
pnpm build      EXIT: 0
```

## CI Workflow (ci.yml)

- **Triggers:** push to main, pull_request to main
- **Fork safety:** `if` condition checks `github.event.pull_request.head.repo.full_name == github.repository`
- **Concurrency:** cancel-in-progress, grouped by workflow + PR number or ref
- **Permissions:** `contents: read` on all jobs
- **Jobs:**
  1. **lint** -- checkout (v4), node 24, corepack enable, pnpm install --frozen-lockfile, pnpm lint
  2. **typecheck** -- same setup + pnpm typecheck
  3. **unit-test** -- same setup + pnpm test
  4. **integration-test** -- postgres service container (postgis/postgis:17-3.5), pnpm --filter api test:e2e, test:contract, prisma:migrate:test
  5. **build** -- needs [lint, typecheck, unit-test], pnpm build + pnpm --filter mobile export

## Security Workflow (security.yml)

- **Triggers:** weekly Sunday midnight (cron), workflow_dispatch, pull_request to main
- **Fork safety:** same condition check as CI
- **Jobs:**
  1. **codeql** -- CodeQL init + autobuild + analyze (javascript-typescript), security-events: write
  2. **dependency-review** -- PR-only, actions/dependency-review-action@v4
  3. **secret-scan** -- Gitleaks, fetch-depth: 0 for full history

## Dependabot (dependabot.yml)

- **npm (pnpm):** weekly, 5 PR limit, grouped minor/patch updates, label: dependencies
- **GitHub Actions:** weekly, grouped, label: dependencies

## verify-ci.mjs

Zero-dependency Node script that validates:
1. All required files exist (ci.yml, security.yml, dependabot.yml)
2. All workflow actions use pinned versions (no @main, @latest, @master)
3. No hardcoded secrets/tokens in workflow files
4. pnpm-workspace.yaml has valid structure (apps/*, packages/*)
5. Required scripts exist in all workspace package manifests
6. CI workflow has expected jobs, --frozen-lockfile, pull_request trigger, main branch

Exit 0 on success, 1 on failure.
