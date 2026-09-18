const IPAPI_ENDPOINT = "https://ipapi.co/json/";

interface IpApiResponse {
  error?: boolean;
  reason?: string;
  country_name?: string;
  region?: string;
  city?: string;
  latitude?: number;
  longitude?: number;
  org?: string;
  asn?: string;
}

export interface IpGeolocationResult {
  country?: string;
  region?: string;
  city?: string;
  latitude?: number;
  longitude?: number;
  ispName?: string;
  asn?: string;
}

export async function getIpGeolocation(): Promise<IpGeolocationResult> {
  const response = await fetch(IPAPI_ENDPOINT);

  if (!response.ok) {
    throw new Error(`IP geolocation request failed (${response.status})`);
  }

  const data: IpApiResponse = await response.json();

  // ipapi.co returns HTTP 200 with { error: true } when rate-limited or otherwise unable to resolve.
  if (data.error) {
    throw new Error(data.reason || "IP geolocation service returned an error.");
  }

  return {
    country: data.country_name,
    region: data.region,
    city: data.city,
    latitude: data.latitude,
    longitude: data.longitude,
    ispName: data.org,
    asn: data.asn,
  };
}
