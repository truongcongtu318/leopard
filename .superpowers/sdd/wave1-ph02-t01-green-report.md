# PH-02-T01 GREEN Report

## State

IN_REVIEW

## RED evidence

- Coordinator-confirmed environment: Node `24.14.0`, pnpm `11.11.0`.
- Command: `pnpm --filter api --fail-if-no-match test:e2e`.
- Result before implementation: exit `1`; Jest/SWC and workspace selection started correctly, then resolution failed only for the intentionally absent `./app.module.js` import.

## Files changed

- Created `apps/api/src/main.ts`.
- Created `apps/api/src/app.module.ts`.
- Created `apps/api/src/config/env.schema.ts`.
- Created `apps/api/eslint.config.mjs`.
- Modified `apps/api/package.json` build and lint scripts to use the TypeScript 7-compatible compiler path and the local ESLint flat config.
- Created this report.

## Implemented runtime shell

- Nest application creation uses `rawBody: false`.
- Bootstrap enables shutdown hooks and the global `api/v1` prefix.
- A global `ValidationPipe` transforms input, strips non-whitelisted fields, and rejects non-whitelisted input.
- CORS accepts requests without an `Origin` header and browser origins that exactly match the parsed allowlist; other origins are rejected.
- `AppModule` is intentionally empty. No controller or health/Auth/Order/Map/Tracking/Media/Payment/Fleet/Admin behavior exists.

## Environment contract

- `NODE_ENV`: optional; defaults to `development`; accepted values are `development`, `test`, and `production`.
- `PORT`: optional; coerced to an integer from `1` through `65535`; defaults to `3000`.
- `DATABASE_URL`: required absolute URL using the `postgres:` or `postgresql:` protocol.
- `CORS_ORIGINS`: required comma-separated list of absolute URLs; parsed to a trimmed `string[]` for bootstrap.
- Only these four selected keys are supplied to the strict Zod object, so unrelated process-level environment variables do not make startup fail.

## GREEN verification

Fresh final verification used Node `24.14.0`, pnpm `11.11.0`, and `CI=true`:

| Command | Result |
| --- | --- |
| `pnpm --filter api --fail-if-no-match test:e2e` | exit `0`; 1 suite and 1 test passed |
| `pnpm --filter api --fail-if-no-match typecheck` | exit `0` |
| `pnpm --filter api --fail-if-no-match build` | exit `0` |
| `pnpm --filter api --fail-if-no-match lint` | exit `0` |

The E2E request to `/api/v1/runtime-shell` returns the intentional `404`; health remains deferred to PH-02-T05.

## Debugging evidence

- Initial typecheck found implicit `any` parameters in the CORS callback. Explicit callback types fixed it; the rerun exited `0`.
- Initial `nest build` failed before compilation because TypeScript `7.0.2` no longer exports `getParsedCommandLineOfConfigFile`, which Nest CLI `11.0.14` calls. The package build script now invokes `tsc --project tsconfig.json`; build exits `0` without changing dependencies.
- Initial lint found CommonJS globals missing in Jest configs and unsupported decorator parsing. The API-local flat config now inherits `@leopard/config`, supplies CommonJS globals, and enables legacy-decorator parsing; lint exits `0`.

## Risks and follow-up

- `dev` remains `nest start --watch`. Nest CLI's TypeScript 7 build incompatibility was proven for `nest build`; the required GREEN gate does not exercise watch mode, so development watch compatibility remains a follow-up risk.
- No unit test was added for environment parsing because the approved RED/GREEN test contract for T01 is the existing shell E2E test. Invalid configuration still fails synchronously through Zod at bootstrap.

## Ownership confirmation

- No dependency installation was run.
- This agent did not edit `pnpm-lock.yaml`, root/shared/client/docs/infra/CI files, or `apps/mobile/**`.
- No Git-mutating command was run and no commit was created.
- The existing Coordinator-owned lockfile and Agent B mobile changes remain present in the shared working tree and were not modified.

## I-01 dev-runtime investigation

State: `BLOCKED` — the approved SWC path still enters the Nest CLI TypeScript-config loader that is incompatible with TypeScript `7.0.2`.

### Hypothesis and controlled probe

- Root cause already established: Nest CLI `11.0.14` calls `tsBinary.getParsedCommandLineOfConfigFile`, while the locked TypeScript `7.0.2` exports that member as `undefined`.
- Approved hypothesis: an explicit SWC builder might bypass that TypeScript compiler path using the already installed `@swc/core@1.15.46`, without adding a dependency or changing the lockfile.
- Environment: Node `24.14.0`, pnpm `11.11.0`, `CI=true`.
- The first filtered `pnpm exec nest ...` invocation exited `1` before compiler startup because that execution path did not resolve the workspace binary; it is not treated as SWC evidence.
- The workspace shim was then invoked directly from `apps/api` with the exact compiler arguments:

```powershell
.\node_modules\.bin\nest.CMD build --builder swc
```

Result: exit `1` with:

```text
Error  tsBinary.getParsedCommandLineOfConfigFile is not a function
```

### Stop decision

- The explicit SWC builder still calls the broken Nest CLI/TypeScript API before it can compile or start the application.
- Per the review remediation contract, investigation stopped immediately. No guessed alternate builder, helper script, dependency, install, manifest/config/source change, or watch process was attempted.
- Because the SWC build probe failed, `nest start --watch --builder swc` cannot be claimed viable and no runtime-start/shutdown evidence exists.
- The existing `dev: nest start --watch` remains broken under the locked TypeScript 7 toolchain. I-01 is not resolved and requires a Coordinator-approved tooling/manifest decision outside this no-dependency remediation scope.

### Ownership confirmation for this investigation

- Only this required report was updated.
- No API implementation/config/manifest, lockfile, root/shared/client/docs/infra/CI, or mobile file was changed.
- No install or Git-mutating command was run.

## I-01 Coordinator runner remediation attempt

State: `BLOCKED` — the approved no-dependency ESM runner did not satisfy both runtime-start and process-cleanup requirements within one implementation/review cycle. All partial implementation edits were reverted; only this evidence remains.

### RED and implementation scope

- Accepted RED: `pnpm --filter api --fail-if-no-match dev` fails through Nest CLI's removed TypeScript 7 API.
- Implemented a temporary `apps/api/scripts/dev.mjs` and pointed `dev` to it for the controlled GREEN attempt.
- The runner resolved TypeScript through a root-workspace `createRequire`, performed an initial compiler pass, then spawned TypeScript watch and Node watch with inherited stdio/environment, sibling-exit monitoring, signal forwarding, and bounded force-kill logic.
- No dependency, install, lockfile, root/shared/client/docs/infra/CI, or Git change was made.

### Controlled GREEN evidence

- Environment: Node `24.14.0`, pnpm `11.11.0`, `CI=true`, `NODE_ENV=test`, `PORT=32145`, `DATABASE_URL=postgresql://leopard:leopard@127.0.0.1:5432/leopard`, and `CORS_ORIGINS=http://localhost:8081`.
- First runner start failed before compile because TypeScript 7 does not export `typescript/bin/tsc` (`ERR_PACKAGE_PATH_NOT_EXPORTED`). The public `typescript` entry resolved to `lib/version.cjs`; the runner then derived sibling CLI `lib/tsc.js` from that createRequire result.
- Direct TypeScript 7 compilation exposed that the E2E file relies on Jest globals not automatically loaded by this compiler path. A temporary test-scoped `@types/jest` reference allowed initial compilation without adding a dependency.
- Both watchers then started: compiler-watch PID `19752` and node-watch PID `2856`. TypeScript watch reported `Found 0 errors. Watching for file changes.`
- Node watch launched the compiled Nest application, but Nest stopped before listening with:

```text
ERROR [PackageLoader] The "class-validator" package is missing. Please, make sure to install it to take advantage of ValidationPipe.
```

- The runtime never reached the Nest listening state. `class-validator` is not an approved installed API dependency, and this remediation explicitly forbids adding dependencies.

### Cleanup evidence and second blocker

- Sending Ctrl-C twice through the active PTY did not exit the runner or either watcher, so the signal-forwarding/no-orphan contract was not proven on Windows.
- Read-only PID verification showed only the two tracked watcher processes still active; the failed Nest runtime children had already exited.
- The two exact tracked watcher PIDs were then stopped. Follow-up verification found none of PIDs `19752`, `2856`, `19840`, or `2316` remaining.
- The parent runner then exited nonzero after reporting the Node-watch termination. No dev child process remains.

### Stop and rollback decision

- The task's stop condition requires `BLOCKED` if orchestration cannot be made reliable in one implementation/review cycle. Both required outcomes failed: no listening state and no clean Ctrl-C shutdown.
- No further orchestration or validation workaround was attempted. In particular, global `ValidationPipe` was not removed or weakened to bypass its missing runtime dependency.
- The temporary runner file was deleted, `dev` was restored to `nest start --watch`, and the temporary E2E type reference was removed. The API implementation therefore remains at its pre-attempt state.
- Required follow-up is a Coordinator-approved dependency/tooling decision covering the ValidationPipe runtime dependency and a Windows-reliable process-tree shutdown design before Agent B re-review.

## I-01 dependency barrier decision

State: `MANIFEST_READY` — Coordinator approved the missing ValidationPipe runtime dependencies; runner/source work remains intentionally stopped pending Coordinator-owned dependency resynchronization.

### Approved manifest change

- Added exact runtime dependency `class-validator: 0.15.1`.
- Added exact runtime dependency `class-transformer: 0.5.1`.
- These pins satisfy the Coordinator-verified Nest `11.1.28` peer ranges (`class-validator >=0.13.2`, `class-transformer >=0.4.1`) and directly address the observed startup failure from `ValidationPipe` package loading.

### Barrier and next-iteration contract

- No dependency installation or lockfile update was run by this agent. Coordinator must resynchronize the owned lockfile and installed workspace before runner work resumes.
- No runner, bootstrap, test, Nest config, or other source file was changed in this manifest-only step.
- The next runner iteration must treat Windows watcher descendants as process trees: validate every spawned PID and terminate through a Windows tree-aware mechanism such as `taskkill /PID <pid> /T /F` rather than relying on `child.kill` alone.
- Non-Windows handling must use appropriate signal/group semantics and still guarantee sibling teardown and no orphan process.
- Runtime start, clean termination, orphan checks, and the four PH-02-T01 GREEN commands remain pending after Coordinator resync.

### Ownership confirmation

- Changed only `apps/api/package.json` and this report.
- Did not run install, edit `pnpm-lock.yaml`, mutate Git, or change root/shared/client/docs/infra/CI/mobile files.

## I-01 final dev-runner remediation

State: `IN_REVIEW` — the dependency-resynchronized API now compiles, reaches the Nest listening state, and terminates both watcher process trees without orphans.

### Final implementation

- `apps/api/package.json`: `dev` now invokes `node scripts/dev.mjs` instead of the TypeScript 7-incompatible Nest CLI watch path.
- `apps/api/scripts/dev.mjs`: resolves the root-workspace TypeScript public entry and sibling `tsc.js`, runs an initial compile, then starts TypeScript watch and Node watch for `dist/main.js`.
- Every spawned PID is validated as a positive safe integer before termination.
- On Windows, shutdown invokes and awaits `taskkill.exe /PID <pid> /T /F` for each active watcher tree. A nonzero `taskkill` result fails cleanup if the PID remains live; a bounded close wait safely handles a concurrent console-shutdown race.
- On non-Windows, children are detached process-group leaders and shutdown signals the negative group PID.
- The runner handles `SIGINT`, `SIGTERM`, and raw-terminal Ctrl-C; an unexpected watcher exit tears down its sibling and exits nonzero.
- `apps/api/src/app.e2e-spec.ts`: adds a test-scoped Jest type reference so the direct TypeScript 7 compile includes the existing Jest globals without broadening runtime compiler types.

### Lifecycle evidence

Runtime environment: Node `24.14.0`, pnpm `11.11.0`, `CI=true`, `NODE_ENV=test`; a valid test `DATABASE_URL`, `CORS_ORIGINS=http://localhost:8081`, and a dedicated local port were supplied.

- Local restricted-session start: runner PID `19096`, compiler-watch PID `3800`, node-watch PID `13904`, runtime PID `19372`; TypeScript reported `Found 0 errors. Watching for file changes.` and Nest reported `Nest application successfully started`.
- In the restricted session, `taskkill` itself returned `ERROR: Access denied`; the runner correctly treated still-live PIDs as cleanup failure. Follow-up `Get-Process` checks found no tracked PID remaining. This is sandbox-specific negative-path evidence, not the authoritative lifecycle result.
- Coordinator-authoritative Windows lifecycle run: runner PID `1000`, compiler-watch PID `18852` with compiler child PID `15720`, node-watch PID `6388` with Nest runtime PID `11564`.
- That run reported TypeScript 0 errors and Nest successfully started. Sending Ctrl-C to the coordinator caused both awaited `taskkill /T /F` operations to terminate their watcher trees; runner exit was `0`.
- Post-shutdown checks found PIDs `1000`, `18852`, `15720`, `6388`, and `11564` all absent, and the dedicated port `3101` closed.

### Fresh final gates

Executed under Node `24.14.0`, pnpm `11.11.0`, and `CI=true` after the final runner change:

| Command | Result |
| --- | --- |
| `pnpm --filter api --fail-if-no-match test:e2e` | exit `0`; 1 suite and 1 test passed |
| `pnpm --filter api --fail-if-no-match typecheck` | exit `0` |
| `pnpm --filter api --fail-if-no-match build` | exit `0` |
| `pnpm --filter api --fail-if-no-match lint` | exit `0` |

### Final ownership confirmation

- Changed only `apps/api/package.json`, `apps/api/scripts/dev.mjs`, `apps/api/src/app.e2e-spec.ts`, and this report during this runner iteration.
- No dependency installation, lockfile edit, Git mutation, or root/shared/client/docs/infra/CI/mobile change was performed by this agent.
- The exact `class-validator` and `class-transformer` dependency pins were already resynchronized by the Coordinator before this iteration.

## I-02 initial-compile interrupt remediation

State: `IN_REVIEW` (`DONE` implementation and verification).

### Root cause and minimal fix

- Re-review found a startup-only race: the initial compiler inherited stdin, so terminal Ctrl-C could terminate `tsc` before the runner's raw-input handler became authoritative. `main()` then observed the compiler's nonzero exit and reported a genuine compile failure instead of yielding to shutdown.
- `apps/api/scripts/dev.mjs` now starts only the initial compiler with stdin set to `ignore`; its stdout and stderr remain inherited. TypeScript and Node steady-state watchers retain inherited stdio.
- The existing guard immediately after `await waitForExit(initialCompile)` returns when `shuttingDown` is already true, leaving the active shutdown path solely responsible for exit status and cleanup. Genuine unsignaled initial compile failures remain nonzero.
- No M-03 or unrelated runner behavior was changed.

### Authoritative startup-interrupt evidence

- A verification-only, valid compile-delay fixture was used to keep the initial TypeScript compile active. Direct Node 24 TypeScript validation exited `0`; its warm compile took `16,565 ms`.
- During the Coordinator's escalated Windows probe, Ctrl-C was sent while the initial compiler tree was active. No TypeScript watcher or Nest runtime log appeared, proving the interrupt occurred before steady state.
- Runner PID `14972` exited `0`.
- Awaited `taskkill /T /F` removed the initial compiler tree PIDs `5380` and `1252`.
- Post-shutdown verification found runner PID `14972` and compiler PIDs `5380` and `1252` absent; port `3104` was closed.
- The temporary `apps/api/src/i02-valid-slow-compile.ts` fixture was deleted immediately after the probe and the Coordinator confirmed it absent. It is not part of the final implementation.

### Fresh final gates

Coordinator-authoritative verification under Node 24 after deleting the temporary fixture:

| Command | Result |
| --- | --- |
| `pnpm --filter api --fail-if-no-match test:e2e` | exit `0`; 1 suite and 1 test passed |
| `pnpm --filter api --fail-if-no-match typecheck` | exit `0` |
| `pnpm --filter api --fail-if-no-match build` | exit `0` |
| `pnpm --filter api --fail-if-no-match lint` | exit `0` |

### Final scope confirmation

- Final I-02 code change is limited to initial-compiler stdin isolation plus the startup shutdown guard in `apps/api/scripts/dev.mjs`.
- No dependency installation, manifest or lockfile change, Git mutation, or unrelated source change was made for I-02.
