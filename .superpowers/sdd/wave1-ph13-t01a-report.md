# PH-13-T01A Database Compose Slice Report

## State

`IN_REVIEW` — implementation, static verification, runtime PostGIS readiness and cleanup verification are complete. Canonical PH-13-T01 remains `IN_PROGRESS` pending its later application-service slice.

## Contract and scope

- Goal: provide a deterministic local PostgreSQL 17/PostGIS 3.5 service and cleanup-safe verification for the clean PH-02-T02 database workflow.
- Baseline supplied by the task brief: `289e6a9`.
- Owned implementation is limited to `compose.yaml`, `.env.example`, `infra/scripts/wait-for-db.sh`, `infra/scripts/with-compose-cleanup.sh`, `infra/scripts/test-compose.sh`, and this report.
- No application service, API/admin Dockerfile, object storage, deployment behavior, or later PH-13-T01B scope was added.

## RED evidence

The test was created before Compose implementation and executed with Git Bash 5.2.37:

```text
C:\Program Files\Git\bin\bash.exe -lc 'cd /d/leopard && bash infra/scripts/test-compose.sh'
```

Result: exit `1` with the expected missing-baseline failure:

```text
compose verification failed: required file is missing: compose.yaml
```

This proves the test detected the absent database service/config rather than passing against the foundation baseline.

## Implementation

- `compose.yaml` defines only the `postgres` service using `postgis/postgis:17-3.5`.
- Database name, user, password and host port use Compose interpolation with clearly demo-local defaults.
- Health uses `pg_isready` with bounded interval, timeout, retries and start period.
- PostgreSQL data uses a `tmpfs` mount at `/var/lib/postgresql/data`, so removing the container returns the next verification run to a clean database without a persistent named volume.
- `.env.example` contains the exact PH-02 API names `NODE_ENV`, `PORT`, `DATABASE_URL`, and `CORS_ORIGINS`; database and demo-provider selectors are present; real-provider credential fields are blank.
- `wait-for-db.sh` validates its attempt/interval inputs, defaults to 30 attempts at two-second intervals, suppresses Docker probe output, fails nonzero on timeout, and never prints a password or connection URL.
- `with-compose-cleanup.sh` implements the approved status policy exactly: capture command status, always run `docker compose down`, preserve a command failure, otherwise return cleanup failure.
- `test-compose.sh` checks rendered config, exact service/image/health, raw interpolation, ephemeral database storage, environment names, blank real credentials, bounded wait failure, both cleanup-wrapper status branches, runtime container health, `PostGIS_Version()`, deliberate wrapped status `23`, and absence of running services after cleanup.

## Static GREEN evidence

Environment:

- Docker CLI `28.3.0`.
- Git Bash `5.2.37` at `C:\Program Files\Git\bin\bash.exe`.

| Check | Result |
| --- | --- |
| `docker compose config` | exit `0`; rendered `postgis/postgis:17-3.5`, `pg_isready`, interpolated demo-local environment and the PostgreSQL data `tmpfs` |
| `docker compose config --services` | exit `0`; exact output `postgres` |
| `bash -n infra/scripts/wait-for-db.sh infra/scripts/with-compose-cleanup.sh infra/scripts/test-compose.sh` | exit `0` |
| `DB_WAIT_ATTEMPTS=1 bash infra/scripts/test-compose.sh` | printed `compose static verification passed`, then exited `1` only at real database readiness because the daemon is unavailable |

The static test's fake-Docker assertions passed before the runtime boundary:

- Wrapped command status `23` plus cleanup status `19` returned `23` and recorded `docker compose down`.
- Successful command plus cleanup status `19` returned `19`.
- Two failed readiness probes with zero interval returned nonzero, proving bounded timeout behavior without a daemon or credential output.

`docker compose config` emitted a non-fatal warning because this managed environment denies reads of `C:\Users\Pc\.docker\config.json`; config rendering still exited `0`.

## Historical runtime blocker (resolved)

Required command:

```text
bash infra/scripts/with-compose-cleanup.sh bash -lc 'docker compose up -d --wait postgres && bash infra/scripts/test-compose.sh'
```

Result: exit `1`. `docker compose up` failed before image inspection/startup with:

```text
open //./pipe/docker_engine: The system cannot find the file specified.
```

The wrapper still invoked `docker compose down`; cleanup reached the same missing daemon pipe and the original command failure remained nonzero. A direct `docker compose ps --status running` also exited `1` at the same missing pipe.

At that time the environment could not prove image pull, container health, `PostGIS_Version()`, deliberate runtime failure cleanup, or the final no-running-services query. Tests were not skipped or weakened to manufacture a pass. The later Coordinator runtime resolution below supersedes this historical blocker.

## Historical unblock requirement (completed)

The required environment/Coordinator action was to start or provide access to the Docker Desktop Linux-container daemon so `//./pipe/docker_engine` existed, then run:

```text
docker compose config
bash infra/scripts/with-compose-cleanup.sh bash -lc 'docker compose up -d --wait postgres && bash infra/scripts/test-compose.sh'
```

The Coordinator completed this action successfully; exact results are recorded under Coordinator runtime resolution.

## Ownership confirmation

- No pnpm install, dependency, root package/workspace, lockfile, application, documentation, CI, or Git mutation was performed.
- No real credential or personal data was added.

## Coordinator runtime resolution

The Coordinator started the Docker daemon and reran the required GREEN workflow without changing or weakening the test contract.

| Runtime check | Result |
| --- | --- |
| `docker compose config` | exit `0` |
| Cleanup-wrapped Compose command | exit `0` |
| PostgreSQL container health | `healthy` |
| Bounded readiness wait | `database is ready` |
| PostGIS query | `PostGIS 3.5 USE_GEOS=1 USE_PROJ=1 USE_STATS=1` |
| Deliberate wrapped-command failure and cleanup assertion | passed |
| `docker compose ps --status running -q` | empty; `COMPOSE_CLEAN` |

This resolves the environmental blocker recorded above. The final runtime left no Compose service running, and the slice advances to `IN_REVIEW`.

## I-01 loopback-only database port remediation

Cross-review identified that the original short port mapping `${POSTGRES_PORT:-5432}:5432` published PostgreSQL on all host interfaces. Local database access does not require LAN exposure.

### RED

The static test was extended first to require the exact source mapping `127.0.0.1:${POSTGRES_PORT:-5432}:5432`.

```text
DB_WAIT_ATTEMPTS=1 bash infra/scripts/test-compose.sh
```

Before the Compose change, the command exited `1` with:

```text
compose verification failed: postgres port must bind only to the loopback interface
```

### Static GREEN

- `compose.yaml` now maps `127.0.0.1:${POSTGRES_PORT:-5432}:5432`.
- The same static test passed all static assertions and printed `compose static verification passed`; its subsequent readiness step exited nonzero because this static invocation intentionally did not start the service.
- Fresh `docker compose config` exited `0` and rendered `host_ip: 127.0.0.1`, target `5432`, and published port `5432`.

### Post-remediation runtime GREEN

- The first rerun with the default published port `5432` exited nonzero because that host port could not be bound in the Coordinator environment. This was an environmental port collision, not a Compose schema, image, health, or PostGIS failure. The cleanup wrapper ran and left no Compose service running.
- The supported override was then exercised with `POSTGRES_PORT=55432` and a matching `DATABASE_URL` targeting local port `55432`.
- The cleanup-wrapped runtime command exited `0`; PostgreSQL reported `healthy`; the bounded wait reported `database is ready`; and the database returned `PostGIS 3.5 USE_GEOS=1 USE_PROJ=1 USE_STATS=1`.
- The deliberate wrapped-command failure retained its expected nonzero status and cleanup assertion passed.
- Final `docker compose ps --status running -q` output was empty and the Coordinator recorded `COMPOSE_CLEAN`.

Cross-review verdict: `APPROVED`. Important finding I-01 is closed. The loopback-only mapping works with both the default port contract and the documented `POSTGRES_PORT` override mechanism, while the successful runtime proves the non-conflicting override path end to end. The slice remains `IN_REVIEW` pending Coordinator integration.
