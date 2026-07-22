# PH-02-T01 Pre-D1 Report

## Status

DONE — preparation is complete; RED and GREEN remain pending the Coordinator's D1 dependency barrier.

## Files changed

- `apps/api/package.json`
- `apps/api/tsconfig.json`
- `apps/api/nest-cli.json`
- `apps/api/jest.config.cjs`
- `apps/api/jest-e2e.config.cjs`
- `apps/api/src/app.e2e-spec.ts`

## Preparation completed

- Created the `api` workspace manifest with the seven required scripts and pinned PH-02 framework/test dependencies.
- Added minimal Nest, TypeScript, and Jest configuration for TypeScript E2E test discovery.
- Added a shell E2E test that imports the intentionally absent `./app.module.js`, constructs a Nest application, and checks that a non-health request reaches the application boundary as a 404 after the module is implemented.
- No production application, bootstrap, module, or environment-schema files were created.

## Expected RED evidence after D1

After the Coordinator installs dependencies, run:

```bash
pnpm --filter api --fail-if-no-match test:e2e
```

The command should select the `api` workspace and fail while resolving the intentionally absent `apps/api/src/app.module.ts` (imported as `./app.module.js` under NodeNext ESM). It must not fail because no workspace matched and does not assert the T05 health endpoint.

## Verification performed

- Parsed `apps/api/package.json` as JSON.
- Checked syntax for both Jest configuration files with `node --check`.
- Confirmed all required manifest scripts are present and all four specified PH-02 version pins are exact.
- Confirmed `apps/api/src` contains only `app.e2e-spec.ts`.
- Ran `git diff --check` for owned paths; no whitespace errors.
- At the initial pre-D1 handoff, confirmed no `pnpm-lock.yaml` diff. The Coordinator subsequently generated D1 lockfile changes; this agent did not edit the lockfile.

## D1 manifest remediation

- Replaced `ts-jest@29.4.6`, whose peer metadata rejects the repository's TypeScript `7.0.2`, with `@swc/core@1.15.46` and `@swc/jest@0.2.39`.
- Updated the shared Jest configuration to transform TypeScript using SWC with TypeScript parsing, decorators, legacy decorator metadata, an ES2022 target, and ESM (`es6`) output. The E2E configuration inherits that transform and retains NodeNext `.js`-to-source module mapping.
- Repeated the static JSON, Jest-config syntax, required-script, no-production-file, and no-health-assertion checks after the remediation. No install, RED execution, lockfile change by this agent, or Git-mutating command was run.

## RED runtime remediation

- Coordinator RED evidence showed that `jest@30.4.2` fails before the test loader reaches the intentionally absent application module: its `jest-runtime@30.4.2` calls `clearMocksOnScope`, while the registry resolution provides only `jest-mock` and `@jest/environment` `30.4.1`.
- Changed only the direct Jest pin to `30.4.1`, the approved internally consistent version. This restores the intended RED condition: after dependency synchronization, the E2E command should fail while resolving the absent `./app.module.js`, not inside Jest internals.
- No dependency installation, lockfile update by this agent, production-code change, Git mutation, or additional RED run was performed for this remediation. The Coordinator-owned D1 lockfile currently retains the old `jest@30.4.2` resolution and must be reconciled before the next RED attempt.

## Second RED runtime remediation

- Coordinator RED evidence showed `jest@30.4.1` still fails in Jest internals at `clearMocksOnScope` before module resolution, so it cannot establish the intended missing-application-module RED evidence.
- Mobile runtime verification previously proved that `jest@30.0.5` starts its runner correctly. Changed only the API direct Jest pin from `30.4.1` to `30.0.5` to use that known-good runner version.
- No other API file, dependency installation, lockfile update, production-code change, Git mutation, or additional RED run was performed. The Coordinator must reconcile the owned lockfile before retrying RED.

## Intentionally not run

- `pnpm install` or any package-manager installation.
- The RED E2E command, any test suite, build, lint, typecheck, or migration command.
- Any Git-mutating command.

## Concerns

- The Coordinator's registry metadata check resolved the NestJS availability concern: `@nestjs/common`, `@nestjs/core`, and `@nestjs/testing` `11.1.28` are available, as are the required Prisma, Jest, and Supertest pins.
- PH-02 explicitly fixes NestJS, Prisma, Jest, and Supertest versions, but does not enumerate versions for supporting Nest/Jest packages. Those supporting dependencies are also exact pins, selected to match the approved runtime versions; the Coordinator should review them at D1 together with the lockfile diff.
- Runtime compatibility of the SWC Jest transform remains intentionally unverified until dependencies are installed at D1.

## Ownership

Only owned `apps/api/**` paths and this required report were written. No lockfile, root configuration, shared package, client, documentation, infrastructure, CI, or Git state was mutated.
