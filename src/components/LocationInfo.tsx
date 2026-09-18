import { useState } from "react";

type LocationStatus = "idle" | "loading" | "success" | "error";

interface ResolvedLocation {
  latitude: number;
  longitude: number;
  country?: string;
  region?: string;
  city?: string;
}

interface ReverseGeocodeResponse {
  countryName?: string;
  principalSubdivision?: string;
  city?: string;
  locality?: string;
}

const GEOLOCATION_ERROR_MESSAGES: Record<number, string> = {
  1: "Location access was denied. Enable location permissions for this site and try again.",
  2: "Your position could not be determined. Please try again.",
  3: "The request to get your location timed out. Please try again.",
};

export default function LocationInfo() {
  const [status, setStatus] = useState<LocationStatus>("idle");
  const [location, setLocation] = useState<ResolvedLocation | null>(null);
  const [error, setError] = useState("");

  const isSupported =
    typeof navigator !== "undefined" && !!navigator.geolocation;

  const getLocation = () => {
    if (!isSupported) {
      setStatus("error");
      setError("Geolocation is not supported by your browser.");
      return;
    }

    setStatus("loading");
    setError("");

    navigator.geolocation.getCurrentPosition(
      async (position: GeolocationPosition) => {
        const { latitude, longitude } = position.coords;

        try {
          const response = await fetch(
            `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`
          );

          if (!response.ok) {
            throw new Error(`Reverse geocode request failed (${response.status})`);
          }

          const data: ReverseGeocodeResponse = await response.json();

          setLocation({
            latitude,
            longitude,
            country: data.countryName,
            region: data.principalSubdivision,
            city: data.city || data.locality,
          });
          setStatus("success");
        } catch {
          setStatus("error");
          setError(
            "We found your coordinates but couldn't resolve them to an address. Please try again."
          );
        }
      },
      (geoError: GeolocationPositionError) => {
        setStatus("error");
        setError(
          GEOLOCATION_ERROR_MESSAGES[geoError.code] ||
            "An unknown error occurred while getting your location."
        );
      }
    );
  };

  const isLoading = status === "loading";

  return (
    <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <button
        onClick={getLocation}
        disabled={isLoading || !isSupported}
        className="w-full rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-400"
      >
        {isLoading ? "Locating…" : "Get Location"}
      </button>

      {!isSupported && (
        <p className="mt-4 text-sm text-amber-600">
          Geolocation is not supported by your browser.
        </p>
      )}

      {status === "error" && error && (
        <p className="mt-4 text-sm text-red-600">{error}</p>
      )}

      {status === "success" && location && (
        <dl className="mt-4 space-y-2 text-sm text-slate-700">
          <div className="flex justify-between border-b border-slate-100 pb-1">
            <dt className="font-medium text-slate-500">Country</dt>
            <dd>{location.country || "Unknown"}</dd>
          </div>
          <div className="flex justify-between border-b border-slate-100 pb-1">
            <dt className="font-medium text-slate-500">Region</dt>
            <dd>{location.region || "Unknown"}</dd>
          </div>
          <div className="flex justify-between border-b border-slate-100 pb-1">
            <dt className="font-medium text-slate-500">City</dt>
            <dd>{location.city || "Unknown"}</dd>
          </div>
          <div className="flex justify-between border-b border-slate-100 pb-1">
            <dt className="font-medium text-slate-500">Latitude</dt>
            <dd>{location.latitude.toFixed(6)}</dd>
          </div>
          <div className="flex justify-between pb-1">
            <dt className="font-medium text-slate-500">Longitude</dt>
            <dd>{location.longitude.toFixed(6)}</dd>
          </div>
        </dl>
      )}
    </div>
  );
}
