# PH-02-T01 Independent Cross-Review

## Verdict

APPROVED — after I-01/I-02 remediation; see the final re-review section.

The production shell and final TypeScript 7-compatible development runner satisfy the PH-02-T01 contract. Earlier blocking findings are retained below as review history and are closed by the final re-review.

## Critical findings

None.

## Important findings

### I-01 — The required development runtime script fails before watch mode starts

- File: `apps/api/package.json:7`
- The script remains `nest start --watch`, while the same manifest pins Nest CLI `11.0.14` at `apps/api/package.json:29` and the workspace resolves TypeScript `7.0.2`.
- This is not only a hypothetical risk inherited from the failed `nest build`. Nest CLI's `start` action reads the project tsconfig before calling its build/watch path. Its TypeScript loader deliberately resolves from `process.cwd()` first, so invocation from `apps/api` selects workspace TypeScript 7 rather than the CLI's nested TypeScript version.
- A read-only Node 24 probe from `apps/api` instantiated the installed Nest CLI loader/provider and produced:

  ```text
  {"cwd":"D:\\leopard\\apps\\api","typescript":"7.0.2","getParsedCommandLineOfConfigFile":"undefined"}
  tsconfig parse: FAIL
  TypeError: tsBinary.getParsedCommandLineOfConfigFile is not a function
  ```

- Installed CLI source corroborates the path: `start.action.js:31` calls `getByConfigFilename` before `runBuild` at line 43; `typescript-loader.js:11` resolves TypeScript with `process.cwd()` first; `tsconfig-provider.js:17` calls the missing API. Switching the Nest builder to SWC would not avoid this preflight call.
- The direct `tsc --project tsconfig.json` build at `apps/api/package.json:8` is a valid TypeScript 7-compatible production build and its recorded exit `0` is accepted. The blocker is specifically that the required local development entry point cannot compile, watch, or launch the service.
- Required change: replace `dev` with a TypeScript 7-compatible watch-and-restart workflow, or reconcile the CLI/compiler versions through the Coordinator-owned dependency process, then verify with valid environment input that the command compiles and reaches a listening state. Do not regress the working direct `tsc` build.

## Minor findings

### M-01 — The E2E request does not exercise the configured bootstrap shell

- File: `apps/api/src/app.e2e-spec.ts:15`
- The test creates an application directly from `AppModule` rather than calling `createApplication` from `main.ts`. It therefore does not install or verify `rawBody: false`, shutdown hooks, the `/api/v1` prefix, global validation, or CORS.
- The request at `apps/api/src/app.e2e-spec.ts:28` would return `404` with or without the global prefix because `AppModule` has no routes. It validly preserves the brief-approved minimum intent—module boot plus request acceptance—but it is not evidence for the required bootstrap configuration.
- Follow-up: add focused bootstrap/config tests that create the app through `createApplication`; retain the intentional 404 until PH-02-T05 adds health behavior.

### M-02 — CORS configuration accepts URL forms that are not serialized browser origins

- File: `apps/api/src/config/env.schema.ts:12`
- `z.url()` accepts absolute URL schemes and URL components beyond an HTTP(S) origin, such as a path. The exact comparison at `apps/api/src/main.ts:29` remains deny-by-default and does not broaden access, but a value such as `https://ops.example.com/path` passes startup validation and can never match the browser's serialized `Origin` header.
- Follow-up: constrain entries to canonical HTTP(S) origins containing only scheme, host, and optional port, rejecting credentials, paths, query strings, and fragments.

## Spec compliance

- `NestFactory.create` explicitly uses `rawBody: false` at `apps/api/src/main.ts:13`.
- Shutdown hooks, the `api/v1` global prefix, and the global `ValidationPipe` are configured at `apps/api/src/main.ts:15-23`.
- Validation transforms input and both whitelists and rejects non-whitelisted DTO properties.
- CORS permits requests without an `Origin` header and exact allowlist matches, rejecting other browser origins without reflecting attacker-controlled values in the error.
- `parseEnv` selects only `NODE_ENV`, `PORT`, `DATABASE_URL`, and `CORS_ORIGINS`, then validates them through a typed strict Zod object. Unrelated process environment keys are intentionally ignored rather than causing all normal process environments to fail.
- `NODE_ENV` is enumerated, `PORT` is bounded to valid TCP ports, and `DATABASE_URL` is restricted to PostgreSQL protocols.
- `AppModule` is empty. No health, Auth, Order, Map/ETA, Tracking, Media, Payment, Fleet, Admin, or other feature behavior was added.
- I-01 is the material runtime-contract gap.

## Bootstrap, code quality, and security review

- Application construction and process listening are separated into `createApplication` and `bootstrap`, keeping parsed configuration typed and making later focused tests possible.
- The ESM direct-entry guard prevents listening when `main.ts` is imported by tests.
- CORS matching is exact; no wildcard or substring match exists. Requests lacking an Origin are intentionally supported for non-browser clients and do not bypass browser-enforced CORS.
- No secret, credential, private fixture, protected data, provider call, storage access, authorization shortcut, or business rule exists in this shell.
- No controller means the shell exposes no feature or health endpoint before its planned task.
- M-02 is a strictness/usability issue, not a demonstrated CORS authorization bypass.

## Test and verification assessment

- Coordinator evidence for Node `24.14.0`, pnpm `11.11.0`, and `CI=true` is accepted:
  - `test:e2e`: exit `0`; 1 suite and 1 test passed.
  - `typecheck`: exit `0`.
  - direct `tsc` build: exit `0`.
  - lint: exit `0`.
- The original RED was valid for the approved test-first slice: Jest reached the intentionally missing `AppModule` import.
- Jest/SWC ESM configuration is compatible with the recorded E2E result.
- The current E2E is valid for its narrow boot/request purpose, subject to M-01; it must not be cited as verification of `main.ts` bootstrap behavior.
- The four GREEN gates omitted the required `dev` entry point, allowing I-01 to remain undetected.

## Dependency and scope assessment

- Nest runtime/testing versions align at `11.1.28`; Jest is pinned to the Coordinator-proven `30.0.5`; SWC supplies the Jest TypeScript transform.
- The direct `tsc` build correctly avoids the incompatible Nest CLI config parser and emits the runtime shell without adding dependencies.
- Nest CLI remains useful only after its TypeScript compatibility is reconciled; as currently wired to `dev`, it blocks the developer runtime.
- No dependency addition, manifest expansion beyond the approved foundation, feature implementation, generated artifact, or out-of-scope behavior was found in PH-02-T01.

## Review boundaries

- Review was read-only except for this required cross-review artifact.
- No API implementation, green/pre-D1 report, manifest, lockfile, dependency, generated output, or Git state was modified.

---

## I-01 remediation re-review

### Current verdict

CHANGES_REQUIRED

The original I-01 is closed: `apps/api/package.json:7` no longer enters the Nest CLI/TypeScript 7-incompatible path, and the Coordinator's authoritative Windows run proves the replacement runner reaches Nest listen and cleans the steady-state watcher trees. One new Important lifecycle race remains during the initial compilation phase.

### Critical findings

None.

### Important findings

#### I-02 — An interrupt during initial compilation can bypass awaited cleanup and exit nonzero

- File: `apps/api/scripts/dev.mjs:178`
- `shutdown()` sets `shuttingDown`, starts asynchronous tree cleanup, and intends to exit with code `0` for SIGINT/SIGTERM at `apps/api/scripts/dev.mjs:113-128`.
- If the signal terminates `initialCompile`, the independent continuation after `waitForExit(initialCompile)` observes a signal with `code === null`. It enters the compile-failure branch at lines 180-187 and immediately calls `process.exit(initialResult.code ?? 1)`, without checking `shuttingDown` or awaiting the already-running shutdown promise.
- On Windows this can terminate the runner before the awaited `taskkill /T /F` result and post-kill liveness check complete. On POSIX the process-group signal has been sent, but the runner still exits before `waitForClose` completes. In both cases an intentional Ctrl-C during startup is reported as a compile failure and exits `1`; the Windows no-orphan guarantee is also no longer established by the runner's own cleanup path.
- The Coordinator lifecycle evidence sent Ctrl-C only after TypeScript watch, Node watch, and the Nest runtime were established, so it does not exercise this startup race.
- Required change: after the initial compile wait resolves, make the continuation yield to the active shutdown path when `shuttingDown` is true rather than logging a compile failure or calling `process.exit`; then verify Ctrl-C during a deliberately still-running initial compile exits `0` and leaves the runner/compiler PID tree absent. Keep genuine unsignaled compile failures nonzero.

### Minor findings

#### M-03 — POSIX cleanup has no bounded escalation if a process group ignores the requested signal

- File: `apps/api/scripts/dev.mjs:98`
- Creating detached group leaders and signaling `-pid` is the correct POSIX tree-propagation mechanism. However, the subsequent unbounded `waitForClose` has no timeout or SIGKILL escalation, unlike the explicit Windows tree-force behavior. A nonresponsive watcher could leave shutdown hanging indefinitely.
- This does not invalidate the normal Node/TypeScript watcher path, whose processes are expected to honor SIGINT/SIGTERM, but a bounded escalation would make the stated cleanup guarantee stronger across POSIX environments.

### Accepted remediation evidence

- `dev` now uses the TypeScript 7-compatible `node scripts/dev.mjs` path; initial compile, TypeScript watch, Node watch, and compiled Nest execution use the current Node executable and root-workspace TypeScript.
- The runner validates PIDs before termination and does not interpolate environment data or credentials into process-control commands.
- Windows steady-state cleanup is appropriately tree-aware: both watcher roots are passed as discrete `taskkill.exe /PID <pid> /T /F` arguments, the taskkill processes are awaited, and a nonzero result is checked against target liveness.
- The authoritative Windows run reached `Nest application successfully started`, Ctrl-C returned exit `0`, all runner/compiler/node-watch/runtime PIDs were absent, and the dedicated port was closed. This closes the original I-01 and proves no steady-state orphan in the validated environment.
- POSIX children are detached group leaders and receive shutdown through negative process-group PIDs. This is structurally correct subject to M-03 and the startup race in I-02.
- Unexpected steady-state compiler-watch or node-watch exit triggers sibling teardown and a nonzero runner exit. The `shuttingDown` guard prevents duplicate shutdown work after steady state is established.
- The test-scoped `/// <reference types="jest" />` at `apps/api/src/app.e2e-spec.ts:1` supplies compile-time globals only; it adds no runtime behavior or security exposure.
- Exact `class-transformer` and `class-validator` runtime dependencies are appropriate for the configured global `ValidationPipe`; they close the observed Nest startup dependency error without weakening validation.
- Fresh Coordinator evidence for Node `24.14.0` is accepted: `test:e2e`, `typecheck`, direct `tsc` build, and lint all exited `0` after the runner change.

### Scope and security conclusion

- The runner adds development orchestration only. It does not add an endpoint, feature module, business rule, credential, private data, network destination, or authorization behavior.
- Child processes receive the existing environment without logging it; spawned executable paths and argument arrays are derived from fixed workspace/runtime locations rather than shell strings.
- No shell interpolation is used for Windows termination, and PID validation prevents broad or malformed taskkill targets.
- Prior Minor findings M-01 and M-02 remain follow-ups and are unchanged. I-02 is the only new material blocker found in this remediation.

### Re-review boundaries

- Re-review was read-only except for this appended cross-review section.
- No implementation, green report, manifest, test source, lockfile, dependency, generated output, process, port, or Git state was modified.

---

## Final I-02 re-review

### Final verdict

APPROVED

I-01 and I-02 are closed. No new Critical or Important finding was found in the final runner, startup-interrupt evidence, steady-state lifecycle evidence, or refreshed API gates.

### Critical findings

None.

### Important findings

None.

### I-02 closure

- File: `apps/api/scripts/dev.mjs:177`
- The initial TypeScript compiler alone is spawned with stdin set to `ignore`; `spawnNode` retains inherited stdout/stderr and steady-state watchers retain normal inherited stdin. This prevents the initial compiler from consuming the raw terminal Ctrl-C byte intended for the runner.
- File: `apps/api/scripts/dev.mjs:180`
- Immediately after `waitForExit(initialCompile)`, the `shuttingDown` guard returns from `main()` when the signal handler has already started shutdown. The continuation therefore cannot enter the compile-failure branch or call `process.exit(1)` while the awaited tree cleanup owns termination.
- Genuine initial compile failures remain nonzero because the guard applies only after shutdown has already been requested.
- The authoritative valid slow-compile probe reached neither TypeScript watch nor Nest startup logs, confirming Ctrl-C occurred in the intended initial phase. The runner exited `0`; the initial compiler tree PIDs were absent afterward; the dedicated port was closed.
- The verification-only slow-compile fixture was deleted and confirmed absent. It does not affect the final build or source scope.

### Lifecycle and regression conclusion

- The previously accepted steady-state Windows evidence remains valid: Nest reached listen, Ctrl-C exited `0`, both watcher trees and runtime descendants were absent, and the port was closed.
- Windows uses validated discrete PIDs with awaited `taskkill.exe /T /F`; no shell interpolation or broad termination target is introduced.
- POSIX detached process-group signaling remains structurally appropriate. M-03's lack of bounded escalation remains a non-blocking robustness follow-up, not a demonstrated failure of the supported watcher processes.
- Coordinator-authoritative Node 24 verification after fixture deletion reports `test:e2e`, `typecheck`, direct `tsc` build, and lint all exit `0`.
- The Jest type reference remains compile-time/test-scoped. No endpoint, business behavior, credential, private data, authorization change, or other feature scope was added.
- Prior M-01, M-02, and M-03 remain Minor follow-ups and do not block PH-02-T01 acceptance.

### Final review boundaries

- Final re-review was read-only except for this cross-review artifact update.
- No implementation, green report, manifest, test, lockfile, dependency, generated output, temporary fixture, process, port, or Git state was modified.
