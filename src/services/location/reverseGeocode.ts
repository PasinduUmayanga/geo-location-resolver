import type { BrowserCoordinates } from "./browserGeolocation.ts";

interface ReverseGeocodeResponse {
  countryName?: string;
  principalSubdivision?: string;
  city?: string;
  locality?: string;
}

export interface ReverseGeocodedAddress {
  country?: string;
  region?: string;
  city?: string;
}

export async function reverseGeocode(
  coords: BrowserCoordinates
): Promise<ReverseGeocodedAddress> {
  const response = await fetch(
    `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${coords.latitude}&longitude=${coords.longitude}&localityLanguage=en`
  );

  if (!response.ok) {
    throw new Error(`Reverse geocode request failed (${response.status})`);
  }

  const data: ReverseGeocodeResponse = await response.json();

  return {
    country: data.countryName,
    region: data.principalSubdivision,
    city: data.city || data.locality,
  };
}
