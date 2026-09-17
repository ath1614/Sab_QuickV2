#!/usr/bin/env tsx
// ==============================================================================
// SabQuick Operations Staff Provisioning CLI Tool
// Usage: npx tsx scripts/create-staff.ts --name "Karan Rider" --phone "9876500010" --role RIDER --vehicle "Ather 450X"
// ==============================================================================

import { PrismaClient, Role } from "@prisma/client";

const prisma = new PrismaClient();

function parseArgs() {
  const args = process.argv.slice(2);
  const parsed: Record<string, string> = {};

  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith("--")) {
      const key = args[i].replace(/^--/, "");
      const val = args[i + 1] && !args[i + 1].startsWith("--") ? args[i + 1] : "true";
      parsed[key] = val;
      if (val !== "true") i++;
    }
  }

  return parsed;
}

async function main() {
  const args = parseArgs();

  const name = args.name;
  const phone = args.phone;
  const roleStr = (args.role || "").toUpperCase();
  const email = args.email;
  const vehicle = args.vehicle;

  if (!name || !phone || !roleStr) {
    console.log(`
Usage:
  npx tsx scripts/create-staff.ts --name "<Name>" --phone "<10-digit-phone>" --role "<RIDER|PACKER|MANAGER|OWNER>" [--email "<email>"] [--vehicle "<vehicle details>"]

Example:
  npx tsx scripts/create-staff.ts --name "Vikram Singh" --phone "9876512345" --role RIDER --vehicle "EV Scooter DL-04-1234"
`);
    process.exit(1);
  }

  if (!/^[6-9]\d{9}$/.test(phone)) {
    console.error("❌ Error: Phone must be a valid 10-digit Indian mobile number starting with 6-9.");
    process.exit(1);
  }

  if (!["RIDER", "PACKER", "MANAGER", "OWNER"].includes(roleStr)) {
    console.error("❌ Error: Role must be one of: RIDER, PACKER, MANAGER, OWNER.");
    process.exit(1);
  }

  const role = roleStr as Role;

  console.log(`\n======================================================`);
  console.log(`   🚀 SABQUICK STAFF PROVISIONING CLI`);
  console.log(`======================================================`);
  console.log(`Name:    ${name}`);
  console.log(`Phone:   +91 ${phone}`);
  console.log(`Role:    [${role}]`);
  if (email) console.log(`Email:   ${email}`);
  if (vehicle && role === Role.RIDER) console.log(`Vehicle: ${vehicle}`);
  console.log(`------------------------------------------------------`);

  try {
    const user = await prisma.user.upsert({
      where: { phone },
      update: {
        name,
        role,
        phoneVerified: true,
        ...(email ? { email } : {}),
      },
      create: {
        name,
        phone,
        role,
        phoneVerified: true,
        ...(email ? { email } : {}),
      },
    });

    if (role === Role.RIDER) {
      await prisma.riderProfile.upsert({
        where: { userId: user.id },
        update: {
          vehicleDetails: vehicle || "EV Scooter",
          isOnline: true,
        },
        create: {
          userId: user.id,
          vehicleDetails: vehicle || "EV Scooter",
          isOnline: true,
          currentLat: parseFloat(process.env.NEXT_PUBLIC_STORE_LAT || "28.6139"),
          currentLng: parseFloat(process.env.NEXT_PUBLIC_STORE_LNG || "77.2090"),
        },
      });
      console.log(`🏍️  RiderProfile provisioned (status: Online)`);
    }

    console.log(`✅ Staff Account successfully provisioned for ${user.name} (${user.id})`);
    console.log(`======================================================\n`);
  } catch (err: any) {
    console.error("❌ Failed to provision staff account:", err.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
