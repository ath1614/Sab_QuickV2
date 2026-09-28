# SabQuick Database Backup — How It Works

_Last reviewed: 2026-09-28. Answers the client's question: "how does the
database backup work right now, and how will it work?"_

## Current production setup

| Piece | What it is | Where |
|---|---|---|
| Database | PostgreSQL 16 (Docker container `sabquick-postgres-prod`) | Hostinger VPS |
| Data location | Docker volume `pgdata_prod` | On the VPS disk |
| Backup script | `scripts/backup-db.sh` | Repo |
| Off-site copy | Cloudflare R2 (S3-compatible) via AWS CLI or rclone | External bucket |
| Retention | Local archives pruned after **7 days**; R2 copy kept until bucket lifecycle rules apply | — |

## How a backup runs (the pipeline)

1. **Cron on the VPS** invokes `scripts/backup-db.sh` (nightly). If the cron
   entry is not yet installed on the server, install it with:
   ```bash
   crontab -e
   # every night at 3:30 AM IST
   30 21 * * * /bin/bash /opt/sabquick/scripts/backup-db.sh >> /var/log/sabquick-backup.log 2>&1
   ```
2. **`pg_dump`** runs inside the production Postgres container and streams a
   full logical dump (schema + all rows) which is gzipped to
   `backups/sabquick_backup_<YYYYMMDD_HHMMSS>.sql.gz` on the VPS.
3. **Off-site sync** — the script uploads the archive to Cloudflare R2 using
   credentials from `.env.prod` (`R2_BUCKET_NAME`, `R2_ACCESS_KEY_ID`,
   `R2_SECRET_ACCESS_KEY`, `R2_ENDPOINT_URL`). If those env vars are missing,
   the local backup still happens but a warning is logged (this is the one
   gap to verify on the server — see "Action items").
4. **Retention** — local archives older than 7 days are deleted. The R2 copy
   stays (protects against VPS disk failure / ransomware / accidental
   `docker volume rm`).

## How a restore works (when needed)

```bash
# 1. Unzip the archive
gunzip sabquick_backup_20260928_213000.sql.gz

# 2. Restore into the production container (drops nothing; use -c for clean restore)
docker compose --env-file .env.prod -f docker-compose.prod.yml exec -T postgres \
  psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" < sabquick_backup_20260928_213000.sql
```
For a *blank* database, create it first (`CREATE DATABASE sabquick_prod_db;`)
or use `pg_restore -c` against a custom-format dump. The app container should
be stopped during a full restore so no writes interleave.

## What is covered / not covered

- ✅ All database data: orders, customers, products, categories, coupons, staff.
- ✅ Off-site copy in Cloudflare R2 (when credentials configured).
- ⚠️ **Uploaded images** (`/uploads` volume, product photos) live in a
  separate Docker volume `uploads_prod` — include it in backups if product
  images are uploaded through the owner console:
  ```bash
  docker run --rm -v sabquick_uploads_prod:/data -v $(pwd)/backups:/out \
    alpine tar czf /out/uploads_$(date +%F).tar.gz -C /data .
  ```
- ⚠️ Redis is a cache/session store — safe to lose, no backup needed.

## Action items to verify on the VPS (owner/manager)

1. `crontab -l` shows the nightly backup entry.
2. `/var/log/sabquick-backup.log` shows recent successful runs.
3. `.env.prod` has the four `R2_*` values (off-site copies actually happening).
4. Do a **test restore** once into a scratch database — a backup is only real
   if it has been restored.

## Recommended upgrades (roadmap)

- Add `BACKUP_KEEP_DAYS` + count-based pruning to the script.
- Add a weekly full-checksummed archive and monthly restore drill.
- Optional: GitHub Action that runs a `pg_dump` against an SSH tunnel as a
  second, independent backup path.
