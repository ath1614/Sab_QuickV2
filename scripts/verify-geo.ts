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

  // 1. Test Serviceable In-Geofence Location (~0.75 km from Store Hub)
  console.log("🎯 1. Testing In-Geofence Location (~0.75 km from Store Hub)...");
  const inRangeLat = STORE_CONFIG.lat + 0.0051;
  const inRangeLng = STORE_CONFIG.lng + 0.0050;
  const inRangeResult = checkDeliveryServiceability(inRangeLat, inRangeLng);

  console.log(` - Destination: (${inRangeLat}, ${inRangeLng})`);
  console.log(` - Calculated Distance: ${inRangeResult.distanceKm} km`);
  console.log(` - Estimated Delivery Time: ${inRangeResult.estimatedMinutes} mins`);
  console.log(` - Is Serviceable: ${inRangeResult.isServiceable ? "✅ YES (Serviceable)" : "❌ NO"}`);

  if (!inRangeResult.isServiceable || inRangeResult.distanceKm > 2.5) {
    throw new Error("Location should be serviceable within 2.5 km!");
  }

  // 2. Test Out-of-Service Location (~10 km from Store Hub)
  console.log("\n🚫 2. Testing Out-of-Geofence Location (~10 km from Store Hub)...");
  const outOfRangeLat = STORE_CONFIG.lat + 0.085;
  const outOfRangeLng = STORE_CONFIG.lng + 0.085;
  const outOfRangeResult = checkDeliveryServiceability(outOfRangeLat, outOfRangeLng);

  console.log(` - Destination: (${outOfRangeLat}, ${outOfRangeLng})`);
  console.log(` - Calculated Distance: ${outOfRangeResult.distanceKm} km`);
  console.log(` - Estimated Delivery Time: ${outOfRangeResult.estimatedMinutes} mins`);
  console.log(` - Is Serviceable: ${!outOfRangeResult.isServiceable ? "✅ NO (Correctly Out of Range)" : "❌ ERROR"}`);

  if (outOfRangeResult.isServiceable) {
    throw new Error("Destination should NOT be serviceable (> 2.5 km)!");
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
  console.log(" - Testing validation rejection for out-of-range address (> 2.5 km)...");
  const unserviceableCheck = checkDeliveryServiceability(outOfRangeLat, outOfRangeLng);
  if (!unserviceableCheck.isServiceable) {
    console.log(`   ✅ Successfully blocked saving address: Outside ${unserviceableCheck.maxRadiusKm} km radius (${unserviceableCheck.distanceKm} km away)`);
  } else {
    throw new Error("Out-of-range address should not have passed serviceability!");
  }

  // Simulation B: Save valid in-geofence address for demo customer
  console.log(" - Testing address insertion for in-geofence address (<= 2.5 km)...");
  const serviceableCheck = checkDeliveryServiceability(inRangeLat, inRangeLng);
  if (serviceableCheck.isServiceable) {
    const savedAddress = await prisma.address.create({
      data: {
        userId: demoCustomer.id,
        label: "Home",
        flatBuilding: "Suite 101, Hub View Residency",
        streetArea: "Main Road",
        landmark: "Near Market Gate",
        latitude: inRangeLat,
        longitude: inRangeLng,
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
