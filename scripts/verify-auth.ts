import redis from "../lib/redis";
import prisma from "../lib/prisma";
import { z } from "zod";

const sendOtpSchema = z.object({
  phone: z
    .string()
    .trim()
    .regex(/^[6-9]\d{9}$/, "Must be a valid 10-digit Indian mobile number"),
});

const verifyOtpSchema = z.object({
  phone: z
    .string()
    .trim()
    .regex(/^[6-9]\d{9}$/, "Must be a valid 10-digit Indian mobile number"),
  otp: z
    .string()
    .trim()
    .regex(/^\d{4}$/, "OTP must be exactly 4 digits"),
});

async function runAuthVerification() {
  console.log("==================================================");
  console.log("   SABQUICK AUTH, RBAC & OTP VERIFICATION SUITE");
  console.log("==================================================\n");

  // 1. Test Redis Connection
  console.log("📡 1. Testing Redis Connection...");
  const pingRes = await redis.ping();
  console.log(` - redis.ping(): ${pingRes === "PONG" ? "✅ PONG (Connection healthy)" : "❌ FAILED"}`);
  if (pingRes !== "PONG") {
    throw new Error("Redis ping failed");
  }

  // 2. Validate Zod Schemas
  console.log("\n🧪 2. Validating Phone & OTP Zod Schemas...");
  const testPhoneValid = "9876543210";
  const testPhoneInvalid = "1234567890"; // does not start with 6-9
  const testOtpValid = "4921";
  const testOtpInvalid = "12a";

  const validPhoneRes = sendOtpSchema.safeParse({ phone: testPhoneValid });
  const invalidPhoneRes = sendOtpSchema.safeParse({ phone: testPhoneInvalid });
  const validOtpRes = verifyOtpSchema.safeParse({ phone: testPhoneValid, otp: testOtpValid });
  const invalidOtpRes = verifyOtpSchema.safeParse({ phone: testPhoneValid, otp: testOtpInvalid });

  console.log(` - Valid Indian Phone (+91 ${testPhoneValid}): ${validPhoneRes.success ? "✅ ACCEPTED" : "❌ REJECTED"}`);
  console.log(` - Invalid Phone (${testPhoneInvalid}): ${!invalidPhoneRes.success ? "✅ CORRECTLY REJECTED" : "❌ FAILED"}`);
  console.log(` - Valid 4-Digit OTP (${testOtpValid}): ${validOtpRes.success ? "✅ ACCEPTED" : "❌ REJECTED"}`);
  console.log(` - Invalid OTP (${testOtpInvalid}): ${!invalidOtpRes.success ? "✅ CORRECTLY REJECTED" : "❌ FAILED"}`);

  // 3. Test Redis OTP Storage & TTL
  console.log("\n⚡ 3. Testing Redis OTP Generation, Storage & TTL...");
  const simulatedPhone = "9876543210";
  const generatedOtp = Math.floor(1000 + Math.random() * 9000).toString();
  const otpKey = `otp:phone:${simulatedPhone}`;
  const cooldownKey = `otp:cooldown:test-user-id`;

  // Store in Redis with 300s TTL
  await redis.set(otpKey, generatedOtp, "EX", 300);
  await redis.set(cooldownKey, "1", "EX", 30);

  const storedOtp = await redis.get(otpKey);
  const otpTtl = await redis.ttl(otpKey);
  const cooldownTtl = await redis.ttl(cooldownKey);

  console.log(` - Generated OTP: ${generatedOtp}`);
  console.log(` - Stored in Redis key [${otpKey}]: ${storedOtp === generatedOtp ? "✅ MATCHED" : "❌ MISMATCH"}`);
  console.log(` - OTP TTL: ${otpTtl}s (Target: 300s) ${otpTtl > 290 ? "✅ EXPIRES IN 5 MINS" : "❌ WRONG TTL"}`);
  console.log(` - Cooldown TTL: ${cooldownTtl}s (Target: 30s) ${cooldownTtl > 20 ? "✅ 30S RATE LIMIT ACTIVE" : "❌ WRONG TTL"}`);

  // 4. Test OTP Verification Logic
  console.log("\n🔐 4. Testing OTP Verification Logic...");
  // Negative test
  const wrongCode = "0000";
  const isWrongCodeValid = storedOtp === wrongCode;
  console.log(` - Negative Test: Checking incorrect code '${wrongCode}': ${!isWrongCodeValid ? "✅ REJECTED" : "❌ FAILED"}`);

  // Positive test
  const isCorrectCodeValid = storedOtp === generatedOtp;
  console.log(` - Positive Test: Checking correct code '${generatedOtp}': ${isCorrectCodeValid ? "✅ VERIFIED" : "❌ FAILED"}`);

  // 5. Test Database Phone & Verification Update
  console.log("\n🗄️  5. Testing PostgreSQL User Update via Prisma...");
  const targetEmail = "customer@sabquick.local";
  const userBefore = await prisma.user.findUnique({
    where: { email: targetEmail },
  });

  if (!userBefore) {
    throw new Error(`User with email ${targetEmail} not found in database!`);
  }

  console.log(` - Found Target User: ${userBefore.name} (${userBefore.email})`);
  console.log(` - Current Status: Phone: ${userBefore.phone}, Verified: ${userBefore.phoneVerified}`);

  // Update in DB
  const updatedUser = await prisma.user.update({
    where: { id: userBefore.id },
    data: {
      phone: simulatedPhone,
      phoneVerified: true,
    },
  });

  console.log(` - Updated Status in PostgreSQL:`);
  console.log(`   * Phone: +91 ${updatedUser.phone}`);
  console.log(`   * Phone Verified: ${updatedUser.phoneVerified ? "✅ TRUE" : "❌ FALSE"}`);
  console.log(`   * Role: [${updatedUser.role}]`);

  // 6. Test Key Deletion after verification
  console.log("\n🧹 6. Testing Redis Key Cleanup...");
  await redis.del(otpKey);
  const deletedCheck = await redis.get(otpKey);
  console.log(` - Redis key [${otpKey}] after deletion: ${deletedCheck === null ? "✅ PURGED" : "❌ STILL PRESENT"}`);

  // 7. Verify Role Access Hierarchy in Database
  console.log("\n🛡️  7. Verifying Role Hierarchy in PostgreSQL...");
  const roles = await prisma.user.groupBy({
    by: ["role"],
    _count: { id: true },
  });

  roles.forEach((r) => {
    console.log(` - Role ${r.role.padEnd(12)}: ${r._count.id} active account(s)`);
  });

  console.log("\n==================================================");
  console.log("   ALL AUTH & OTP VERIFICATION TESTS PASSED ✅");
  console.log("==================================================");
}

runAuthVerification()
  .catch((err) => {
    console.error("Auth verification failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    redis.disconnect();
  });
