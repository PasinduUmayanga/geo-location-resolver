import type { BrowserFailureReason } from "../../types/location.ts";

const GEOLOCATION_ERROR_MESSAGES: Record<number, string> = {
  1: "Location access was denied. Enable location permissions for this site and try again.",
  2: "Your position could not be determined. Please try again.",
  3: "The request to get your location timed out. Please try again.",
};

const GEOLOCATION_ERROR_REASONS: Record<number, BrowserFailureReason> = {
  1: "permission-denied",
  2: "position-unavailable",
  3: "timeout",
};

export class GeolocationError extends Error {
  constructor(
    message: string,
    public readonly reason: BrowserFailureReason
  ) {
    super(message);
    this.name = "GeolocationError";
  }
}

export interface BrowserCoordinates {
  latitude: number;
  longitude: number;
  accuracyMeters: number;
}

export function isGeolocationSupported(): boolean {
  return typeof navigator !== "undefined" && !!navigator.geolocation;
}

export function getBrowserCoordinates(): Promise<BrowserCoordinates> {
  return new Promise((resolve, reject) => {
    if (!isGeolocationSupported()) {
      reject(
        new GeolocationError(
          "Geolocation is not supported by your browser.",
          "unsupported"
        )
      );
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position: GeolocationPosition) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracyMeters: position.coords.accuracy,
        });
      },
      (geoError: GeolocationPositionError) => {
        reject(
          new GeolocationError(
            GEOLOCATION_ERROR_MESSAGES[geoError.code] ||
              "An unknown error occurred while getting your location.",
            GEOLOCATION_ERROR_REASONS[geoError.code] || "unknown"
          )
        );
      }
    );
  });
}
