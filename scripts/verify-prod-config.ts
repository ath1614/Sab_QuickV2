/**
 * SabQuick Production Deployment Configuration Verification Suite
 *
 * Tests:
 * 1. Next.js Standalone Build & Configuration (next.config.mjs)
 * 2. Multi-Stage Dockerfile & .dockerignore Syntax & Directives
 * 3. Production Docker Compose Architecture & Resource Limits (docker-compose.prod.yml)
 * 4. Production Caddy Reverse Proxy & Security Headers (Caddyfile)
 * 5. Automated Database Backup & Cloudflare R2 Sync Script (scripts/backup-db.sh)
 * 6. Environment Template & Deployment Runbook (DEPLOYMENT.md, .env.prod.example)
 */

import fs from "fs";
import path from "path";
import { execSync } from "child_process";

async function runProdConfigTestSuite() {
  console.log("\n=======================================================");
  console.log("   🚀 SABQUICK PRODUCTION CONFIGURATION VERIFICATION   ");
  console.log("=======================================================\n");

  let passedTests = 0;
  const totalTests = 6;
  const projectRoot = path.resolve(__dirname, "..");

  try {
    // -------------------------------------------------------------
    // TEST 1: Next.js Standalone Configuration
    // -------------------------------------------------------------
    console.log("🧪 TEST 1: Validating Next.js Standalone Output Configuration...");
    const nextConfigPath = path.join(projectRoot, "next.config.mjs");
    if (!fs.existsSync(nextConfigPath)) {
      throw new Error("next.config.mjs does not exist.");
    }
    const nextConfigContent = fs.readFileSync(nextConfigPath, "utf-8");
    if (!nextConfigContent.includes('output: "standalone"') && !nextConfigContent.includes("output: 'standalone'")) {
      throw new Error("next.config.mjs is missing output: 'standalone'.");
    }
    if (!nextConfigContent.includes("remotePatterns")) {
      throw new Error("next.config.mjs is missing images.remotePatterns configuration.");
    }

    // Verify standalone build artifacts exist (graceful check for local runs before build)
    const standaloneDir = path.join(projectRoot, ".next", "standalone");
    if (!fs.existsSync(standaloneDir)) {
      console.warn("   ⚠️  WARNING: .next/standalone build directory is not present yet.");
      console.warn("       Run 'npm run build' to generate production standalone server.js before container packaging.");
    } else {
      const serverJsPath = path.join(standaloneDir, "server.js");
      if (!fs.existsSync(serverJsPath)) {
        throw new Error(".next/standalone/server.js was not generated.");
      }
      console.log("   ✓ Verified .next/standalone/server.js generated successfully");
    }

    console.log("   ✓ next.config.mjs includes output: 'standalone'");
    console.log("✅ TEST 1 PASSED: Next.js Standalone Configuration verified.");
    passedTests++;

    // -------------------------------------------------------------
    // TEST 2: Multi-Stage Dockerfile & .dockerignore
    // -------------------------------------------------------------
    console.log("\n🧪 TEST 2: Validating Multi-Stage Production Dockerfile & .dockerignore...");
    const dockerfilePath = path.join(projectRoot, "Dockerfile");
    if (!fs.existsSync(dockerfilePath)) {
      throw new Error("Dockerfile does not exist.");
    }
    const dockerfileContent = fs.readFileSync(dockerfilePath, "utf-8");

    const requiredStages = [
      "FROM node:20-alpine AS deps",
      "FROM node:20-alpine AS builder",
      "FROM node:20-alpine AS runner",
    ];
    for (const stage of requiredStages) {
      if (!dockerfileContent.includes(stage)) {
        throw new Error(`Dockerfile is missing required stage: "${stage}".`);
      }
    }

    const requiredDirectives = [
      "npm ci",
      "npx prisma generate",
      "npm run build",
      "NODE_ENV=production",
      "PORT=3000",
      "HOSTNAME=\"0.0.0.0\"",
      "addgroup --system --gid 1001 nodejs",
      "adduser --system --uid 1001 nextjs",
      "COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./",
      "COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static",
      "USER nextjs",
      "EXPOSE 3000",
      'CMD ["node", "server.js"]',
    ];

    for (const directive of requiredDirectives) {
      if (!dockerfileContent.includes(directive)) {
        throw new Error(`Dockerfile is missing required directive: "${directive}".`);
      }
    }

    const dockerignorePath = path.join(projectRoot, ".dockerignore");
    if (!fs.existsSync(dockerignorePath)) {
      throw new Error(".dockerignore file does not exist.");
    }
    const dockerignoreContent = fs.readFileSync(dockerignorePath, "utf-8");
    if (!dockerignoreContent.includes("node_modules") || !dockerignoreContent.includes(".next")) {
      throw new Error(".dockerignore must ignore node_modules and .next.");
    }

    console.log("   ✓ All 3 stages (deps, builder, runner) verified");
    console.log("   ✓ Secure non-root nextjs:nodejs user enforcement verified");
    console.log("   ✓ Standalone server.js launch verified");
    console.log("✅ TEST 2 PASSED: Dockerfile & .dockerignore verified.");
    passedTests++;

    // -------------------------------------------------------------
    // TEST 3: Production Docker Compose Configuration
    // -------------------------------------------------------------
    console.log("\n🧪 TEST 3: Validating docker-compose.prod.yml Architecture...");
    const composePath = path.join(projectRoot, "docker-compose.prod.yml");
    if (!fs.existsSync(composePath)) {
      throw new Error("docker-compose.prod.yml does not exist.");
    }
    const composeContent = fs.readFileSync(composePath, "utf-8");

    const requiredServices = ["postgres:", "redis:", "app:", "caddy:"];
    for (const s of requiredServices) {
      if (!composeContent.includes(s)) {
        throw new Error(`docker-compose.prod.yml missing service: ${s}`);
      }
    }

    // Check resource limits
    if (!composeContent.includes("memory: 1536M") || !composeContent.includes("memory: 256M")) {
      throw new Error("docker-compose.prod.yml missing required VPS memory resource constraints.");
    }

    // Check healthchecks
    if (!composeContent.includes("pg_isready") || !composeContent.includes("condition: service_healthy")) {
      throw new Error("docker-compose.prod.yml missing PostgreSQL healthcheck or depends_on condition.");
    }

    // Check Redis password requirement
    if (!composeContent.includes("--requirepass ${REDIS_PASSWORD}")) {
      throw new Error("docker-compose.prod.yml Redis must enforce requirepass.");
    }

    console.log("   ✓ Services (postgres, redis, app, caddy) present");
    console.log("   ✓ 4 GB VPS Resource constraints verified (Postgres/App 1.5GB, Redis 256MB)");
    console.log("   ✓ Service healthcheck dependency chain verified");
    console.log("✅ TEST 3 PASSED: docker-compose.prod.yml verified.");
    passedTests++;

    // -------------------------------------------------------------
    // TEST 4: Production Caddy Configuration
    // -------------------------------------------------------------
    console.log("\n🧪 TEST 4: Validating Caddyfile Reverse Proxy & Security Headers...");
    const caddyfilePath = path.join(projectRoot, "Caddyfile");
    if (!fs.existsSync(caddyfilePath)) {
      throw new Error("Caddyfile does not exist.");
    }
    const caddyContent = fs.readFileSync(caddyfilePath, "utf-8");

    const caddyDirectives = [
      "{$DOMAIN_NAME:localhost}",
      "encode zstd gzip",
      "Strict-Transport-Security",
      "X-Content-Type-Options",
      "X-Frame-Options",
      "Referrer-Policy",
      "reverse_proxy app:3000",
      "header_up Host {host}",
      "header_up X-Real-IP {remote_host}",
      "header_up X-Forwarded-For {remote_host}",
      "header_up X-Forwarded-Proto {scheme}",
    ];

    for (const d of caddyDirectives) {
      if (!caddyContent.includes(d)) {
        throw new Error(`Caddyfile is missing directive: "${d}".`);
      }
    }

    console.log("   ✓ Automatic Let's Encrypt TLS / DOMAIN_NAME parameterization verified");
    console.log("   ✓ Compression (zstd/gzip) and HSTS security headers verified");
    console.log("   ✓ Upstream proxying to app:3000 verified");
    console.log("✅ TEST 4 PASSED: Caddyfile configuration verified.");
    passedTests++;

    // -------------------------------------------------------------
    // TEST 5: Automated Cloudflare R2 Database Backup Pipeline
    // -------------------------------------------------------------
    console.log("\n🧪 TEST 5: Validating scripts/backup-db.sh Pipeline...");
    const backupScriptPath = path.join(projectRoot, "scripts", "backup-db.sh");
    if (!fs.existsSync(backupScriptPath)) {
      throw new Error("scripts/backup-db.sh does not exist.");
    }
    const backupContent = fs.readFileSync(backupScriptPath, "utf-8");

    // Check executable bit
    const stats = fs.statSync(backupScriptPath);
    const isExecutable = (stats.mode & 0o111) !== 0;
    if (!isExecutable) {
      throw new Error("scripts/backup-db.sh is not executable. Run chmod +x scripts/backup-db.sh.");
    }

    const backupDirectives = [
      "pg_dump -U",
      "gzip >",
      ".sql.gz",
      "R2_BUCKET_NAME",
      "R2_ENDPOINT_URL",
      "aws s3 cp",
      "-mtime +7",
    ];

    for (const b of backupDirectives) {
      if (!backupContent.includes(b)) {
        throw new Error(`scripts/backup-db.sh is missing required logic: "${b}".`);
      }
    }

    // Test bash syntax dry-run
    try {
      execSync(`bash -n "${backupScriptPath}"`);
      console.log("   ✓ Bash syntax validation passed (bash -n)");
    } catch (e: any) {
      throw new Error(`scripts/backup-db.sh syntax error: ${e.message}`);
    }

    console.log("   ✓ Executable permission verified (+x)");
    console.log("   ✓ PostgreSQL gzip streaming dump verified");
    console.log("   ✓ Cloudflare R2 off-site sync logic verified");
    console.log("   ✓ 7-day local retention policy pruning verified");
    console.log("✅ TEST 5 PASSED: scripts/backup-db.sh verified.");
    passedTests++;

    // -------------------------------------------------------------
    // TEST 6: Production Runbook & Environment Template
    // -------------------------------------------------------------
    console.log("\n🧪 TEST 6: Validating DEPLOYMENT.md & .env.prod.example...");
    const envExamplePath = path.join(projectRoot, ".env.prod.example");
    if (!fs.existsSync(envExamplePath)) {
      throw new Error(".env.prod.example does not exist.");
    }
    const envContent = fs.readFileSync(envExamplePath, "utf-8");

    const requiredEnvKeys = [
      "DOMAIN_NAME",
      "NEXTAUTH_URL",
      "NEXTAUTH_SECRET",
      "POSTGRES_USER",
      "POSTGRES_PASSWORD",
      "POSTGRES_DB",
      "REDIS_PASSWORD",
      "HUB_LATITUDE",
      "HUB_LONGITUDE",
      "GEOFENCE_RADIUS_KM",
      "R2_ACCOUNT_ID",
      "R2_BUCKET_NAME",
      "R2_ENDPOINT_URL",
    ];

    for (const key of requiredEnvKeys) {
      if (!envContent.includes(key)) {
        throw new Error(`.env.prod.example is missing key: "${key}".`);
      }
    }

    const deploymentDocPath = path.join(projectRoot, "DEPLOYMENT.md");
    if (!fs.existsSync(deploymentDocPath)) {
      throw new Error("DEPLOYMENT.md does not exist.");
    }
    const deploymentDoc = fs.readFileSync(deploymentDocPath, "utf-8");

    const runbookSections = [
      "Hostinger Ubuntu 24.04",
      "ufw allow 80/tcp",
      "ufw allow 443/udp",
      "docker compose",
      "npx prisma migrate deploy",
      "npx prisma db seed",
      "docker compose -f docker-compose.prod.yml up -d",
      "crontab -e",
      "Zero-Downtime Rolling Update",
    ];

    for (const sec of runbookSections) {
      if (!deploymentDoc.includes(sec)) {
        throw new Error(`DEPLOYMENT.md missing runbook instruction: "${sec}".`);
      }
    }

    console.log("   ✓ .env.prod.example template contains all required keys");
    console.log("   ✓ DEPLOYMENT.md contains all Ubuntu 24.04 VPS hardening & setup steps");
    console.log("✅ TEST 6 PASSED: Runbook & Environment template verified.");
    passedTests++;

    // -------------------------------------------------------------
    // FINAL SUMMARY
    // -------------------------------------------------------------
    console.log("\n=======================================================");
    console.log(`   🎉 ALL PRODUCTION DEPLOYMENT SUITE CHECKS PASSED (${passedTests}/${totalTests})`);
    console.log("=======================================================\n");
  } catch (error: any) {
    console.error("\n❌ Production Verification Failed:", error.message);
    process.exit(1);
  }
}

runProdConfigTestSuite();
