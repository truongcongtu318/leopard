# Pilot Recovery Evidence

> **Wave 5 — PH-13-T05: Recovery Drill Documentation**
> Branch: `codex/integration-wave-5-release`
> Date: 2026-08-19

## Recovery Procedure

### 1. Pre-Recovery: Create Backup

```bash
export DATABASE_URL=postgresql://leopard:***@db-host:5432/leopard
./infra/scripts/backup.sh --output-dir=./backups
```

**Expected output:**
- `backups/leopard_backup_YYYYMMDD_HHMMSS.sql.gz` — compressed SQL dump
- `backups/leopard_backup_YYYYMMDD_HHMMSS.manifest.json` — record counts + SHA-256

### 2. Restore to Fresh Database

```bash
export DATABASE_URL=postgresql://leopard:***@db-host:5432/leopard_restore
./infra/scripts/restore.sh backups/leopard_backup_YYYYMMDD_HHMMSS.sql.gz \
  --target-url=postgresql://leopard:***@db-host:5432/leopard_restore
```

**Verification steps:**
1. ✅ SHA-256 checksum matches manifest
2. ✅ All tables restored with correct record counts
3. ✅ Main role journeys pass (Customer → create order, Driver → accept, Fleet Owner → view, Admin → dashboard)

### 3. Post-Restore Smoke Test

```bash
# Run E2E tests against restored database
DATABASE_URL=postgresql://leopard:***@db-host:5432/leopard_restore \
  pnpm --filter api test:e2e
```

## Recovery Time Objective (RTO)

| Step | Expected Duration |
| --- | --- |
| Detect failure | < 5 min (health check interval) |
| Locate latest backup | < 1 min |
| Restore database | < 5 min (pilot data volume) |
| Verify integrity | < 2 min |
| Restart application | < 2 min |
| **Total RTO** | **< 15 min** |

## Recovery Point Objective (RPO)

- Daily automated backup → RPO = 24 hours maximum
- Staging backup schedule configurable via cron

## Drill Checklist

- [ ] Backup script runs without errors
- [ ] Manifest JSON includes all table counts
- [ ] SHA-256 checksum computed and stored
- [ ] Restore script reads compressed backup
- [ ] Checksum verification passes
- [ ] Record counts match post-restore
- [ ] E2E tests pass against restored database
- [ ] Application starts normally with restored data
