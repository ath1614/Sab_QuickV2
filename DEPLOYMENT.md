# SabQuick Production Deployment Runbook
**Target Environment:** Ubuntu 24.04 LTS KVM VPS (Hostinger, 2-4 vCPU, 4-8 GB RAM)  
**Stack:** Next.js 14 Standalone Container, PostgreSQL 16 Alpine, Redis 7 Alpine, Caddy 2 (Automatic TLS & HTTP/3), Cloudflare R2 Off-site Backups.

---

## Architecture Overview

```
                          Internet (HTTPS / HTTP3)
                                     │
                                     ▼
                     ┌───────────────────────────────┐
                     │   Hostinger Ubuntu 24.04 VPS  │
                     │   UFW: 22, 80, 443 (TCP/UDP)  │
                     └───────────────┬───────────────┘
                                     │
                                     ▼
                     ┌───────────────────────────────┐
                     │       Caddy 2 Reverse Proxy    │
                     │  (Let's Encrypt TLS, HTTP/3)   │
                     └───────────────┬───────────────┘
                                     │ (Internal Docker Network)
                                     ▼
         ┌────────────────────────────────────────────────────────┐
         │                  sabquick-prod-net                     │
         │                                                        │
         │  ┌────────────────────┐      ┌──────────────────────┐  │
         │  │   Next.js Standalone│ ────▶│  PostgreSQL 16 DB    │  │
         │  │   Container (app)  │      │  (pgdata_prod vol)   │  │
         │  └─────────┬──────────┘      └──────────────────────┘  │
         │            │                            ▲              │
         │            ▼                            │ pg_dump      │
         │  ┌────────────────────┐      ┌──────────┴───────────┐  │
         │  │    Redis 7 Cache   │      │  Nightly Backup Cron │  │
         │  │   & Pub/Sub broker │      │  scripts/backup-db.sh│  │
         │  └────────────────────┘      └──────────┬───────────┘  │
         └─────────────────────────────────────────┼──────────────┘
                                                   │ S3 API
                                                   ▼
                                        Cloudflare R2 Bucket
                                      (Encrypted Off-Site)
```

---

## Phase 1: VPS Provisioning & OS Hardening

### 1. Connect & Update System Packages
```bash
ssh root@<YOUR_VPS_IP>

# Update package repository and upgrade existing packages
apt-get update && apt-get upgrade -y
apt-get install -y curl wget git ufw fail2ban htop unzip jq awscli
```

### 2. Configure Non-Root Deployer User
```bash
adduser deployer
usermod -aG sudo deployer

# Copy authorized SSH keys from root
mkdir -p /home/deployer/.ssh
cp /root/.ssh/authorized_keys /home/deployer/.ssh/
chown -R deployer:deployer /home/deployer/.ssh
chmod 700 /home/deployer/.ssh
chmod 600 /home/deployer/.ssh/authorized_keys
```

### 3. Firewall Hardening (UFW)
Only expose necessary ports: SSH (22), HTTP (80), and HTTPS (443 TCP & UDP for HTTP/3 QUIC).
```bash
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp comment 'SSH'
ufw allow 80/tcp comment 'HTTP (ACME & Redirect)'
ufw allow 443/tcp comment 'HTTPS'
ufw allow 443/udp comment 'HTTP/3 QUIC'
ufw enable

# Verify active status
ufw status verbose
```

### 4. Configure Fail2ban for SSH Protection
```bash
systemctl enable fail2ban
systemctl start fail2ban
```

---

## Phase 2: Docker Engine & Compose Plugin Installation

Install official Docker packages for Ubuntu 24.04 (Noble Numbat):

```bash
# Add Docker's official GPG key:
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
chmod a+r /etc/apt/keyrings/docker.asc

# Add repository to Apt sources:
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  tee /etc/apt/sources.list.d/docker.list > /dev/null

apt-get update
apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Grant Docker socket permissions to deployer user:
usermod -aG docker deployer
systemctl enable docker
systemctl start docker

# Verify Docker Compose installation
docker compose version
```

---

## Phase 3: Project Repository & Secrets Setup

### 1. Switch to Deployer User & Clone Repo
```bash
su - deployer

git clone https://github.com/your-username/sabquick.git /home/deployer/sabquick
cd /home/deployer/sabquick
```

### 2. Configure Production Secrets (`.env.prod`)
Copy the template and populate production secrets:
```bash
cp .env.prod.example .env.prod
nano .env.prod
```

Generate high-entropy credentials:
```bash
# Generate NEXTAUTH_SECRET:
openssl rand -base64 32

# Generate POSTGRES_PASSWORD:
openssl rand -base64 24

# Generate REDIS_PASSWORD:
openssl rand -base64 24
```

Example verified `.env.prod`:
```ini
DOMAIN_NAME=sabquick.yourdomain.com
NEXTAUTH_URL=https://sabquick.yourdomain.com
NEXT_PUBLIC_APP_URL=https://sabquick.yourdomain.com

NEXTAUTH_SECRET=u0N5t...YOUR_GENERATED_KEY...=

POSTGRES_USER=sabquick_prod_user
POSTGRES_PASSWORD=YOUR_STRONG_PG_PASSWORD
POSTGRES_DB=sabquick_prod_db

REDIS_PASSWORD=YOUR_STRONG_REDIS_PASSWORD

HUB_LATITUDE=28.6289
HUB_LONGITUDE=77.2065
GEOFENCE_RADIUS_KM=2.5

# Cloudflare R2 Off-site Backup
R2_ACCOUNT_ID=xxxxxxxxxxxxxxxxxxxx
R2_ACCESS_KEY_ID=xxxxxxxxxxxxxxxxxxxx
R2_SECRET_ACCESS_KEY=xxxxxxxxxxxxxxxxxxxx
R2_BUCKET_NAME=sabquick-db-backups
R2_ENDPOINT_URL=https://xxxxxxxxxxxxxxxxxxxx.r2.cloudflarestorage.com
```

### 3. Configure DNS Records
In your DNS provider (Cloudflare, Hostinger DNS, Namecheap, etc.):
- **Type A**: Point `sabquick.yourdomain.com` $\rightarrow$ `<YOUR_VPS_IP>`
- **Proxy Status**: If using Cloudflare, set to **DNS Only** (Grey Cloud) initially to allow Caddy's ACME HTTP-01 challenge to issue the Let's Encrypt TLS certificate.

---

## Phase 4: Database Migrations, Seeding & Launch

### 1. Start Database & Cache Containers First
```bash
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d postgres redis

# Check health status until postgres shows (healthy):
docker compose -f docker-compose.prod.yml ps
```

### 2. Run Prisma Migrations in Production
Deploy existing Prisma migrations against the production PostgreSQL instance:
```bash
docker compose -f docker-compose.prod.yml run --rm app npx prisma migrate deploy
```

### 3. Seed Initial Inventory & Operational Personas
Seed dark-store categories, products, inventory counts, and operational role accounts:
```bash
docker compose -f docker-compose.prod.yml run --rm app npx prisma db seed
```

### 4. Build & Launch Entire Production Cluster
```bash
docker compose -f docker-compose.prod.yml up -d
# Or to rebuild images on first deploy:
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build
```

Verify all 4 containers are running and healthy:
```bash
docker compose -f docker-compose.prod.yml ps
```

Output should show:
```
NAME                    IMAGE                STATUS                   PORTS
sabquick-app-prod       sabquick-app         Up (healthy)             3000/tcp
sabquick-caddy-prod     caddy:2-alpine       Up                       0.0.0.0:80->80/tcp, 0.0.0.0:443->443/tcp, 443/udp
sabquick-postgres-prod  postgres:16-alpine   Up (healthy)             5432/tcp
sabquick-redis-prod     redis:7-alpine       Up (healthy)             6379/tcp
```

---

## Phase 5: Automated Nightly Cloudflare R2 Backups

### 1. Test Backup Script Interactively
```bash
chmod +x scripts/backup-db.sh
./scripts/backup-db.sh
```
Verify that `backups/sabquick_backup_*.sql.gz` is created and synced to Cloudflare R2.

### 2. Configure Linux Cron Job
Open deployer crontab:
```bash
crontab -e
```

Add the nightly cron entry (runs daily at 02:30 AM server time):
```cron
30 2 * * * /home/deployer/sabquick/scripts/backup-db.sh >> /home/deployer/sabquick/backups/backup.log 2>&1
```

---

## Phase 6: Monitoring & Maintenance Operations

### 1. Live Application Logs
```bash
# Stream all container logs:
docker compose -f docker-compose.prod.yml logs -f

# View Next.js app logs only:
docker compose -f docker-compose.prod.yml logs -f app

# View Caddy reverse proxy & TLS handshake logs:
docker compose -f docker-compose.prod.yml logs -f caddy
```

### 2. Zero-Downtime Rolling Update Workflow
When deploying updates from Git:
```bash
cd /home/deployer/sabquick

# 1. Pull latest verified commit
git pull origin main

# 2. Rebuild standalone application image in background
docker compose -f docker-compose.prod.yml --env-file .env.prod build app

# 3. Apply schema migrations if any
docker compose -f docker-compose.prod.yml --env-file .env.prod run --rm app npx prisma migrate deploy

# 4. Restart app container with zero downtime (Caddy auto-reconnects)
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --no-deps app

# 5. Prune old dangling build cache
docker image prune -f
```

### 3. Manual Database Restore Procedure
In the event of recovery:
```bash
# Uncompress archive and restore directly into container:
gunzip -c backups/sabquick_backup_YYYYMMDD_HHMMSS.sql.gz | \
  docker compose -f docker-compose.prod.yml exec -T postgres psql -U sabquick_prod_user -d sabquick_prod_db
```
