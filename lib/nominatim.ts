export interface GeocodedAddress {
  flatBuilding: string;
  streetArea: string;
  city: string;
  postcode: string;
  displayName: string;
  latitude: number;
  longitude: number;
}

/**
 * Reverse geocodes latitude/longitude using OpenStreetMap Nominatim API.
 * Adheres to OSM Nominatim policy with User-Agent header.
 */
export async function reverseGeocode(
  lat: number,
  lon: number
): Promise<GeocodedAddress> {
  const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1`;

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "SabQuickApp/1.0 (contact@sabquick.local)",
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`Nominatim HTTP error: ${response.status}`);
    }

    const data = await response.json();
    const address = data.address || {};

    const flatBuilding =
      address.building ||
      address.house_number ||
      address.commercial ||
      address.office ||
      address.amenity ||
      "";

    const streetArea =
      address.road ||
      address.suburb ||
      address.neighbourhood ||
      address.residential ||
      address.quarter ||
      "";

    const city =
      address.city ||
      address.town ||
      address.state_district ||
      address.state ||
      "New Delhi";

    const postcode = address.postcode || "";

    return {
      flatBuilding: flatBuilding ? `${flatBuilding}` : "",
      streetArea: streetArea || data.name || "Central Delhi",
      city,
      postcode,
      displayName: data.display_name || `${lat.toFixed(4)}, ${lon.toFixed(4)}`,
      latitude: lat,
      longitude: lon,
    };
  } catch (error) {
    console.warn("[Nominatim Reverse Geocoding Error]:", error);
    // Graceful fallback coordinates
    return {
      flatBuilding: "",
      streetArea: `Location (${lat.toFixed(4)}, ${lon.toFixed(4)})`,
      city: "New Delhi",
      postcode: "110001",
      displayName: `Pinned Coordinates: ${lat.toFixed(4)}, ${lon.toFixed(4)}`,
      latitude: lat,
      longitude: lon,
    };
  }
}
