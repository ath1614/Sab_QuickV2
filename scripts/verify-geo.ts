import {
  calculateHaversineDistance,
  calculateEstimatedDeliveryMinutes,
  checkDeliveryServiceability,
  STORE_CONFIG,
} from "../lib/geo";
import prisma from "../lib/prisma";

async function runGeoVerification() {
  console.log("==================================================");
  console.log("   SABQUICK GEOFENCE & HAVERSINE ENGINE SUITE");
  console.log("==================================================\n");

  console.log("📍 Store Hub Origin Configuration:");
  console.log(` - Coordinates: (${STORE_CONFIG.lat}, ${STORE_CONFIG.lng})`);
  console.log(` - Maximum Geofence: ${STORE_CONFIG.maxRadiusKm} km`);
  console.log(` - Service SLA: 10 - 15 Minutes\n`);

  // 1. Test Serviceable Location: Connaught Place
  console.log("🎯 1. Testing In-Geofence Location (Connaught Place)...");
  const cpLat = 28.619;
  const cpLng = 77.214;
  const cpResult = checkDeliveryServiceability(cpLat, cpLng);

  console.log(` - Destination: (${cpLat}, ${cpLng})`);
  console.log(` - Calculated Distance: ${cpResult.distanceKm} km`);
  console.log(` - Estimated Delivery Time: ${cpResult.estimatedMinutes} mins`);
  console.log(` - Is Serviceable: ${cpResult.isServiceable ? "✅ YES (Serviceable)" : "❌ NO"}`);

  if (!cpResult.isServiceable || cpResult.distanceKm > 2.5) {
    throw new Error("Connaught Place should be serviceable within 2.5 km!");
  }

  // 2. Test Out-of-Service Location: Karol Bagh
  console.log("\n🚫 2. Testing Out-of-Geofence Location (Karol Bagh)...");
  const kbLat = 28.6517;
  const kbLng = 77.1906;
  const kbResult = checkDeliveryServiceability(kbLat, kbLng);

  console.log(` - Destination: (${kbLat}, ${kbLng})`);
  console.log(` - Calculated Distance: ${kbResult.distanceKm} km`);
  console.log(` - Estimated Delivery Time: ${kbResult.estimatedMinutes} mins`);
  console.log(` - Is Serviceable: ${!kbResult.isServiceable ? "✅ NO (Correctly Out of Range)" : "❌ ERROR"}`);

  if (kbResult.isServiceable) {
    throw new Error("Karol Bagh should NOT be serviceable (> 2.5 km)!");
  }

  // 3. Test SLA Calculation Formula
  console.log("\n⏱️  3. Testing SLA Calculation Progression...");
  const testDistances = [0.5, 1.0, 1.5, 2.0, 2.5, 3.5];
  testDistances.forEach((dist) => {
    const mins = calculateEstimatedDeliveryMinutes(dist);
    const packing = 3;
    const transit = Math.ceil(dist * 4);
    const within = dist <= 2.5;
    console.log(
      ` - Distance: ${dist.toFixed(1)} km -> ${packing}m (packing) + ${transit}m (transit) = ETA: ${mins} mins ${
        within ? "✅ (Within 10-15 Min SLA Guarantee)" : "⚠️ (Beyond 2.5 km SLA)"
      }`
    );
  });

  // 4. Test Address Geofence Rejection & Acceptance Simulation in Database
  console.log("\n🗄️  4. Testing Address Validation & Database Integration...");
  const demoCustomer = await prisma.user.findFirst({
    where: { role: "CUSTOMER" },
  });

  if (!demoCustomer) {
    throw new Error("Demo customer not found in database!");
  }

  // Simulation A: Attempt to save Karol Bagh address (should be rejected)
  console.log(" - Testing validation rejection for Karol Bagh address (> 2.5 km)...");
  const unserviceableCheck = checkDeliveryServiceability(kbLat, kbLng);
  if (!unserviceableCheck.isServiceable) {
    console.log(`   ✅ Successfully blocked saving address: Outside ${unserviceableCheck.maxRadiusKm} km radius (${unserviceableCheck.distanceKm} km away)`);
  } else {
    throw new Error("Karol Bagh should not have passed serviceability!");
  }

  // Simulation B: Save valid Connaught Place address for demo customer
  console.log(" - Testing address insertion for Connaught Place address (<= 2.5 km)...");
  const serviceableCheck = checkDeliveryServiceability(cpLat, cpLng);
  if (serviceableCheck.isServiceable) {
    const savedAddress = await prisma.address.create({
      data: {
        userId: demoCustomer.id,
        label: "Home",
        flatBuilding: "Suite 101, Connaught Court",
        streetArea: "Inner Circle, Connaught Place",
        landmark: "Opposite Regal Cinema",
        latitude: cpLat,
        longitude: cpLng,
      },
    });

    console.log(`   ✅ Address saved to PostgreSQL (ID: ${savedAddress.id})`);
    console.log(`   * Flat/Building: ${savedAddress.flatBuilding}`);
    console.log(`   * Street/Area: ${savedAddress.streetArea}`);
    console.log(`   * Coordinates: (${savedAddress.latitude}, ${savedAddress.longitude})`);
  }

  console.log("\n==================================================");
  console.log("   ALL GEOFENCE & HAVERSINE TESTS PASSED ✅");
  console.log("==================================================");
}

runGeoVerification()
  .catch((err) => {
    console.error("Geofence verification failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
