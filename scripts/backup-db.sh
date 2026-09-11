#!/usr/bin/env bash
# ==============================================================================
# SabQuick Automated PostgreSQL Backup & Cloudflare R2 Sync Pipeline
# Intended for nightly cron execution on Ubuntu 24.04 LTS KVM VPS.
# ==============================================================================

set -euo pipefail

# Determine script and project root directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

# Load production environment variables if available
ENV_FILE="${PROJECT_ROOT}/.env.prod"
if [[ -f "${ENV_FILE}" ]]; then
  # Export non-commented lines from .env.prod
  export $(grep -v '^#' "${ENV_FILE}" | xargs -0) 2>/dev/null || true
fi

# Fallback defaults
POSTGRES_USER="${POSTGRES_USER:-sabquick_prod_user}"
POSTGRES_DB="${POSTGRES_DB:-sabquick_prod_db}"
COMPOSE_FILE="${PROJECT_ROOT}/docker-compose.prod.yml"
BACKUP_DIR="${PROJECT_ROOT}/backups"

# Timestamp and filename
TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
BACKUP_FILENAME="sabquick_backup_${TIMESTAMP}.sql.gz"
BACKUP_FILEPATH="${BACKUP_DIR}/${BACKUP_FILENAME}"

echo "=================================================================="
echo "   SabQuick PostgreSQL Automated Backup & Cloudflare R2 Sync     "
echo "   Date: $(date '+%Y-%m-%d %H:%M:%S %Z')                         "
echo "=================================================================="

# Ensure backup destination directory exists
mkdir -p "${BACKUP_DIR}"

# Verify docker compose file exists
if [[ ! -f "${COMPOSE_FILE}" ]]; then
  echo "[-] ERROR: Compose file not found at ${COMPOSE_FILE}" >&2
  exit 1
fi

echo "[*] Step 1: Exporting and compressing PostgreSQL database '${POSTGRES_DB}'..."
if docker compose -f "${COMPOSE_FILE}" exec -T postgres pg_dump -U "${POSTGRES_USER}" "${POSTGRES_DB}" | gzip > "${BACKUP_FILEPATH}"; then
  FILESIZE=$(ls -lh "${BACKUP_FILEPATH}" | awk '{print $5}')
  echo "[+] Backup successfully created: ${BACKUP_FILENAME} (${FILESIZE})"
else
  echo "[-] ERROR: pg_dump export failed!" >&2
  rm -f "${BACKUP_FILEPATH}"
  exit 1
fi

# Verify backup file is non-empty
if [[ ! -s "${BACKUP_FILEPATH}" ]]; then
  echo "[-] ERROR: Backup archive is empty (0 bytes). Removing corrupt file." >&2
  rm -f "${BACKUP_FILEPATH}"
  exit 1
fi

# Step 2: Off-site Sync to Cloudflare R2
echo "[*] Step 2: Syncing backup archive off-site to Cloudflare R2 S3 storage..."
R2_SYNCED=false

if [[ -n "${R2_BUCKET_NAME:-}" && -n "${R2_ACCESS_KEY_ID:-}" && -n "${R2_SECRET_ACCESS_KEY:-}" && -n "${R2_ENDPOINT_URL:-}" ]]; then
  if command -v aws &>/dev/null; then
    echo "[*] Detected AWS CLI. Uploading via S3 API to R2 bucket '${R2_BUCKET_NAME}'..."
    AWS_ACCESS_KEY_ID="${R2_ACCESS_KEY_ID}" \
    AWS_SECRET_ACCESS_KEY="${R2_SECRET_ACCESS_KEY}" \
    AWS_DEFAULT_REGION="auto" \
    aws s3 cp "${BACKUP_FILEPATH}" "s3://${R2_BUCKET_NAME}/backups/${BACKUP_FILENAME}" \
      --endpoint-url="${R2_ENDPOINT_URL}" \
      --no-progress

    echo "[+] Cloudflare R2 off-site sync complete via AWS CLI."
    R2_SYNCED=true
  elif command -v rclone &>/dev/null; then
    echo "[*] Detected Rclone. Uploading to R2..."
    rclone copyto "${BACKUP_FILEPATH}" "r2:${R2_BUCKET_NAME}/backups/${BACKUP_FILENAME}"
    echo "[+] Cloudflare R2 off-site sync complete via Rclone."
    R2_SYNCED=true
  else
    echo "[!] WARNING: Neither 'aws' CLI nor 'rclone' found in PATH. Skipping off-site R2 sync."
    echo "[!] Install awscli via: sudo apt-get install -y awscli"
  fi
else
  echo "[i] NOTICE: Cloudflare R2 credentials not fully configured in .env.prod. Skipping off-site sync."
fi

# Step 3: Local Backup Retention (Prune archives older than 7 days)
echo "[*] Step 3: Pruning local backups older than 7 days in ${BACKUP_DIR}..."
PRUNED_COUNT=0
while IFS= read -r old_file; do
  if [[ -n "${old_file}" ]]; then
    rm -f "${old_file}"
    echo "    - Removed stale backup: $(basename "${old_file}")"
    PRUNED_COUNT=$((PRUNED_COUNT + 1))
  fi
done < <(find "${BACKUP_DIR}" -type f -name "sabquick_backup_*.sql.gz" -mtime +7)

echo "[+] Retention policy enforced: Pruned ${PRUNED_COUNT} archive(s)."
echo "=================================================================="
echo "   Backup completed successfully at $(date '+%Y-%m-%d %H:%M:%S') "
echo "=================================================================="
