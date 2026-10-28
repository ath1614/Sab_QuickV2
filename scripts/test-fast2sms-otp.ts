import fs from "fs";
import path from "path";

// Load .env
const envPath = path.resolve(process.cwd(), ".env");
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf-8");
  for (const line of envContent.split("\n")) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#")) {
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx !== -1) {
        const key = trimmed.slice(0, eqIdx).trim();
        const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, "");
        if (!process.env[key]) {
          process.env[key] = val;
        }
      }
    }
  }
}

async function testFast2Sms(phone: string) {
  const apiKey = process.env.FAST2SMS_API_KEY || process.env.SMS_GATEWAY_API_KEY;
  if (!apiKey) {
    console.error("❌ FAST2SMS_API_KEY is not defined in environment variables!");
    process.exit(1);
  }

  const cleanPhone = phone.replace(/\D/g, "").slice(-10);
  if (cleanPhone.length !== 10) {
    console.error(`❌ Invalid 10-digit phone number: ${phone}`);
    process.exit(1);
  }

  const testOtp = Math.floor(1000 + Math.random() * 9000).toString();

  console.log("===================================================================");
  console.log("  📲 FAST2SMS LIVE OTP DISPATCH TEST                               ");
  console.log("===================================================================");
  console.log(`Target Phone: +91 ${cleanPhone}`);
  console.log(`Generated OTP: ${testOtp}`);
  console.log(`Using Fast2SMS Route: "otp" (Quick TRAI DLT approved template)`);
  console.log(`Endpoint: https://www.fast2sms.com/dev/bulkV2`);
  console.log("-------------------------------------------------------------------");

  try {
    let res = await fetch("https://www.fast2sms.com/dev/bulkV2", {
      method: "POST",
      headers: {
        authorization: apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        route: "otp",
        variables_values: testOtp,
        numbers: cleanPhone,
      }),
    });

    let data = await res.json().catch(() => ({}));

    if (!data.return && (data.status_code === 996 || data.status_code === 400 || data.status_code === 411)) {
      console.log(`⚠️ Route "otp" returned code ${data.status_code}. Automatically trying Quick route "q"...`);
      res = await fetch("https://www.fast2sms.com/dev/bulkV2", {
        method: "POST",
        headers: {
          authorization: apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          route: "q",
          message: `SabQuick verification code: ${testOtp}. Valid for 5 mins.`,
          numbers: cleanPhone,
        }),
      });
      data = await res.json().catch(() => ({}));
    }

    if (data.return) {
      console.log("\n✅ SUCCESS: Fast2SMS accepted and dispatched the SMS!");
      console.log("Response:", JSON.stringify(data, null, 2));
      console.log(`\n🎉 Check mobile phone +91 ${cleanPhone} for OTP [${testOtp}]!`);
    } else {
      console.error("\n❌ ERROR: Fast2SMS rejected the request.");
      console.error("Response:", JSON.stringify(data, null, 2));
    }
  } catch (err: any) {
    console.error("\n❌ Network or fetch exception:", err.message);
  }
}

const targetPhone = process.argv[2] || process.env.TEST_PHONE || "";
if (!targetPhone) {
  console.error("Usage: npx tsx scripts/test-fast2sms-otp.ts <10-digit-phone> (or set TEST_PHONE)");
  process.exit(1);
}
testFast2Sms(targetPhone);
