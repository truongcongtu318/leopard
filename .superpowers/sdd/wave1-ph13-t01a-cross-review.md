# PH-13-T01A Independent Cross-Review

## Verdict

APPROVED — after I-01 loopback remediation; see the final re-review section.

The PostgreSQL/PostGIS service, loopback-only publication, exact wrapper status policy, bounded readiness loop, PostGIS verification, and ordinary failure cleanup satisfy the PH-13-T01A contract. The original network-exposure finding is retained below as review history and is closed by the final re-review.

## Critical findings

None.

## Important findings

### I-01 — Demo-credential PostgreSQL is exposed on all host interfaces

- File: `compose.yaml:11`
- The short port syntax `${POSTGRES_PORT:-5432}:5432` binds the database to all host interfaces by default. The same service intentionally uses the public demo-local credentials at `compose.yaml:7-9` and `.env.example:6-9`.
- On Linux hosts, and on Docker Desktop configurations that permit LAN forwarding, another machine able to reach the developer host can attempt PostgreSQL access with credentials committed in the example. The values are appropriately non-secret for local use, but that is exactly why the service should not be network-exposed beyond the local host.
- Required change: bind the published database port to loopback, for example `127.0.0.1:${POSTGRES_PORT:-5432}:5432`, and extend the rendered-config check to require loopback host IP. This preserves host API/Prisma access through `localhost` while preventing accidental LAN exposure.

## Minor findings

### M-01 — The implementation report still records the obsolete daemon blocker

- File: `.superpowers/sdd/wave1-ph13-t01a-report.md:3`
- The report remains `BLOCKED` and its runtime section says the Docker daemon is unavailable, while the Coordinator has since supplied authoritative runtime evidence for healthy PostgreSQL, the PostGIS 3.5 query, failure-status preservation, and final `COMPOSE_CLEAN`.
- Follow-up: append the unblocked runtime evidence and move the slice report to `IN_REVIEW` so the handoff artifact reflects current state. The evidence itself is accepted for this review.

### M-02 — “Always cleanup” applies to returned statuses, not wrapper termination signals

- File: `infra/scripts/with-compose-cleanup.sh:5`
- The wrapper exactly matches the status-policy script mandated by the approved plan: it captures a normal command result, runs `docker compose down`, preserves command failure, and otherwise surfaces cleanup failure.
- There is no `EXIT`, `INT`, or `TERM` trap, so terminating the wrapper process itself can bypass line 8. This is not a deviation from the exact approved implementation for T01A, but callers should not treat it as signal-safe cleanup. Consider a separately approved hardening change before relying on it for long interactive operations.

### M-03 — Runtime verification does not exercise the host `DATABASE_URL` path

- File: `infra/scripts/test-compose.sh:125`
- Readiness and PostGIS checks execute inside the container via `docker compose exec`. They prove server/extension health, but not that the host-published TCP port accepts the `.env.example` user/password/database combination used by Prisma.
- Follow-up: after loopback binding, add a host-side connection probe when an appropriate PostgreSQL client is available, or let PH-02-T02's Prisma migration command serve as the authoritative host-path integration check.

## Exact status and cleanup policy

- `infra/scripts/with-compose-cleanup.sh:4-14` matches the approved policy verbatim in behavior.
- A wrapped command failure wins over cleanup failure; this preserves the original diagnostic status.
- When the command succeeds, a nonzero `docker compose down` status is surfaced.
- `test-compose.sh:84-103` statically proves both branches with statuses 23 and 19 and confirms `compose down` was invoked.
- Coordinator runtime evidence proves the deliberate wrapped failure remained nonzero and no Compose service remained afterward. Final `COMPOSE_CLEAN` is accepted.
- M-02 documents only asynchronous wrapper termination; it does not invalidate the approved ordinary-failure proof.

## Health, readiness, and database assessment

- `compose.yaml:5` uses the exact required `postgis/postgis:17-3.5` image tag.
- `compose.yaml:12-19` defines `pg_isready` with a 2-second interval, 5-second probe timeout, 15 retries, and 5-second start period; Compose health is bounded.
- `wait-for-db.sh:4-15` validates positive integer attempts and a nonnegative numeric interval. Defaults are 30 attempts with two seconds between attempts, and timeout exits nonzero without exposing connection strings or passwords.
- `wait-for-db.sh:21-22` suppresses probe output, so Docker/PostgreSQL diagnostics cannot echo credentials through this helper.
- `test-compose.sh:117-129` checks container existence, exact healthy state, `psql` error-on-failure, and nonempty `PostGIS_Version()` output.
- Coordinator evidence confirms PostgreSQL reached healthy state and the runtime query reported PostGIS 3.5.
- The tmpfs mount at `compose.yaml:20-21`, combined with `docker compose down`, gives PH-02-T02 a clean non-persistent database on each run.

## Environment and credential review

- `.env.example:1-4` contains the exact API contract names `NODE_ENV`, `PORT`, `DATABASE_URL`, and `CORS_ORIGINS`.
- Database and provider selectors use clearly labeled demo/local values. Real Vietmap, Firebase, payOS, and S3 credential fields are present and blank.
- No personal data, real provider credential, token, or production secret appears in the reviewed files or command output.
- Compose interpolates database identity, password, and host port rather than hard-coding a real credential. I-01 concerns network reachability of the intentional demo default, not secret leakage.

## Portability, security, and scope

- The scripts explicitly target Bash and use constructs supported by Git Bash and common POSIX-like developer environments; syntax validation and the reported Git Bash run are accepted.
- Command arguments are quoted; database identifiers are passed as discrete arguments; no password or URL is interpolated into shell source or logs.
- The fake-Docker directory is created with `mktemp -d`, quoted during use, and removed through an EXIT trap.
- The image tag satisfies the task's exact version contract. Digest pinning is outside this local-development slice and can be handled by later supply-chain policy.
- Compose contains only the `postgres` service. No API/admin image, object storage, deployment behavior, or application feature was added; canonical PH-13-T01 correctly remains incomplete pending T01B.

## Evidence assessment

- Required RED is valid: `test-compose.sh` discovered the absent `compose.yaml` and exited nonzero before implementation.
- `docker compose config` exit `0`, exact service/image/health rendering, Bash syntax, and fake-Docker status checks are accepted.
- Coordinator runtime evidence is accepted: PostgreSQL healthy, PostGIS 3.5 query successful, deliberate wrapper failure preserved, final running-service check empty/`COMPOSE_CLEAN`.
- I-01 is not covered by those gates because successful port publication does not establish safe bind scope.

## Review boundaries

- Review was read-only except for this required cross-review artifact.
- No Compose file, environment template, infrastructure script, implementation report, dependency, generated output, running service, or Git state was modified.

---

## Final I-01 remediation re-review

### Final verdict

APPROVED

I-01 is closed. No new Critical or Important finding was found in the loopback change, port-override runtime, PostGIS readiness, status preservation, or cleanup evidence.

### Critical findings

None.

### Important findings

None.

### I-01 closure

- File: `compose.yaml:11`
- PostgreSQL now publishes as `127.0.0.1:${POSTGRES_PORT:-5432}:5432`. The host address is fixed to IPv4 loopback while the host port remains configurable, so demo-local credentials are no longer reachable through an all-interface bind.
- File: `infra/scripts/test-compose.sh:43`
- Static verification now requires the exact loopback source mapping. The Coordinator's rendered-config evidence independently confirms `host_ip: 127.0.0.1`, eliminating ambiguity in Compose short-syntax interpretation.
- The default host port 5432 was already occupied/denied on the verification host. That is a normal local port conflict rather than a security or configuration regression; the cleanup wrapper ran and left no service.
- The supported `POSTGRES_PORT=55432` rerun used a matching `DATABASE_URL`, exited `0`, reached healthy PostgreSQL, completed bounded readiness, and returned PostGIS 3.5. This proves the configurable loopback path works for the intended local workflow.
- The deliberate wrapped failure retained its status and final Compose state was `COMPOSE_CLEAN`; no container from either the conflicted or successful run remained.

### Remaining Minor follow-ups

- Prior M-01 is closed: the implementation report now has state `IN_REVIEW` and records the resolved Docker runtime evidence. Its last I-01 sentence still says the post-remediation runtime is pending, but the Coordinator evidence and this final review supersede that stale sentence; appending the 55432 result would improve chronology.
- M-02 remains a non-blocking note about signal termination outside the exact approved status policy.
- M-03 remains a non-blocking integration-test note; PH-02-T02's Prisma run can provide the host `DATABASE_URL` proof.

### Scope and security conclusion

- The fix changes only host reachability and its static assertion. Image, healthcheck, tmpfs clean-database behavior, environment interpolation, blank real-provider credentials, and single-service scope remain intact.
- No real credential, personal data, application service, API/admin image, object storage, or deployment behavior was introduced.
- Canonical PH-13-T01 appropriately remains `IN_PROGRESS` until T01B, while this database slice is approved for PH-02-T02 consumption.

### Final review boundaries

- Final re-review was read-only except for this cross-review artifact update.
- No implementation, report, Compose service, environment file, script, generated output, port, dependency, or Git state was modified.
