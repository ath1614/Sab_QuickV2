/**
 * One-time migration: hash every legacy plaintext staff/owner PIN.
 *
 * Run once during the deploy window, before the new code starts serving:
 *   npx tsx scripts/migrate-pin-hashes.ts
 *
 * The script is idempotent, never prints a PIN, and only reports counts.
 */
import prisma from "../lib/prisma";
import { hashPasscode, isPasscodeHashed } from "../lib/passcode";

async function main() {
  const users = await prisma.user.findMany({
    where: { pin: { not: null } },
    select: { id: true, pin: true },
  });

  const legacy = users.filter((user) => user.pin && !isPasscodeHashed(user.pin));

  if (legacy.length === 0) {
    console.log("No legacy plaintext PINs found.");
    return;
  }

  let migrated = 0;
  for (const user of legacy) {
    await prisma.user.update({
      where: { id: user.id },
      data: {
        pin: hashPasscode(user.pin as string),
        pinChangedAt: new Date(),
      },
    });
    migrated++;
  }

  console.log(`Hashed ${migrated} legacy PIN(s). No values were logged.`);
}

main()
  .catch((error) => {
    console.error("PIN migration failed:", error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
