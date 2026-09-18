export type StepId = "browser-geolocation" | "reverse-geocode" | "ip-geolocation";

export type StepStatus = "idle" | "trying" | "success" | "failed" | "skipped";

export interface LocationStep {
  id: StepId;
  label: string;
  status: StepStatus;
  detail?: string;
}

export type LocationSource = "browser" | "ip";

export interface LocationHints {
  timezone?: string;
  locale?: string;
}

export interface NormalizedLocation {
  country?: string;
  region?: string;
  city?: string;
  latitude?: number;
  longitude?: number;
  accuracyMeters?: number;
  source: LocationSource;
  ispName?: string;
  asn?: string;
  hints: LocationHints;
}

export const INITIAL_LOCATION_STEPS: LocationStep[] = [
  { id: "browser-geolocation", label: "Browser Geolocation", status: "idle" },
  { id: "reverse-geocode", label: "Reverse Geocode", status: "idle" },
  { id: "ip-geolocation", label: "IP Geolocation Fallback", status: "idle" },
];
