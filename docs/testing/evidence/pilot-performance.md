# Pilot Performance & Recovery Evidence

> **Wave 5 — PH-13-T05: Performance, Recovery and Observability**
> Branch: `codex/integration-wave-5-release`
> Date: 2026-08-19

## Performance Test Tools

### Load Test Script: `infra/scripts/load-pilot.js`

Simulates representative read/write load against the API server with weighted scenario distribution:

| Scenario | Weight | Type | Role |
| --- | --- | --- | --- |
| `GET /orders` | 3 | Read | Customer |
| `POST /orders/estimate` | 2 | Write (compute) | Customer |
| `GET /me` | 2 | Read | Customer |
| `GET /driver/orders/available` | 2 | Read | Driver |
| `PATCH /driver/availability` | 1 | Write | Driver |
| `GET /fleet/profile` | 1 | Read | Fleet Owner |
| `GET /fleet/orders` | 1 | Read | Fleet Owner |
| `GET /admin/dashboard` | 1 | Read | Admin |
| `GET /admin/orders` | 1 | Read | Admin |
| `GET /health` | 1 | Read | System |

**Usage:**
```bash
node infra/scripts/load-pilot.js --base-url=http://localhost:3000 --duration=30 --concurrency=10
```

**Metrics collected:**
- P50, P95, P99 latency (overall and per-endpoint)
- Requests per second (RPS)
- Error rate (%)
- Status code distribution

**SLA targets:**
- P95 ordinary API: < 800ms (excluding external provider latency)
- Tracking socket: < 3s
- Error rate: < 5%

## Recovery Test Tools

### Backup Script: `infra/scripts/backup.sh`

```bash
DATABASE_URL=postgresql://... ./infra/scripts/backup.sh --output-dir=./backups
```

**Features:**
- Timestamped compressed backup (`pg_dump | gzip`)
- JSON manifest with record counts per table
- SHA-256 checksum for integrity verification

### Restore Script: `infra/scripts/restore.sh`

```bash
DATABASE_URL=postgresql://... ./infra/scripts/restore.sh backups/leopard_backup_20260819.sql.gz
```

**Features:**
- SHA-256 checksum verification against backup manifest
- Automatic decompression (`.sql.gz` and `.sql`)
- Post-restore integrity smoke test (record count comparison)
- Manifest-based drift detection

## Observability Requirements

| Requirement | Implementation | Evidence |
| --- | --- | --- |
| Structured logs with requestId | `ApiExceptionFilter` includes `requestId` in every error response | `input-hardening.e2e-spec.ts` verifies `requestId` presence |
| Actor correlation | JWT `sub` claim maps to `actorId` in audit logs | `AuditLog` schema includes `actorId`, `requestId` |
| Error redaction | No stack traces, SQL, or file paths in client responses | `input-hardening.e2e-spec.ts` Section 4 |
| PII protection | Demo phone numbers use reserved examples; no real data in seed | Seed manifest constraint (PH-13-T02) |

## NFR Coverage

| NFR | Requirement | Tool / Evidence |
| --- | --- | --- |
| NFR-01 | P95 ordinary API < 800ms | `load-pilot.js` with SLA exit code |
| NFR-02 | Tracking < 3s | Socket.IO latency in load test |
| NFR-03 | Daily backup and verified restore | `backup.sh` + `restore.sh` with manifest |
| NFR-08 | Health endpoint | `GET /health` in load test scenarios |
| NFR-09 | Structured logging | `requestId` + `actorId` in responses |
| NFR-10 | PII redaction | Error redaction tests + seed constraints |
