import { INITIAL_LOCATION_STEPS } from "../../types/location.ts";
import type {
  BrowserFailureReason,
  LocationStep,
  NormalizedLocation,
  StepId,
  StepStatus,
} from "../../types/location.ts";
import { GeolocationError, getBrowserCoordinates } from "./browserGeolocation.ts";
import { reverseGeocode } from "./reverseGeocode.ts";
import { getIpGeolocation } from "./ipGeolocation.ts";
import { collectHints } from "./hints.ts";

export type StepChangeListener = (steps: LocationStep[]) => void;

export class LocationResolutionError extends Error {
  constructor(
    message: string,
    public readonly steps: LocationStep[]
  ) {
    super(message);
    this.name = "LocationResolutionError";
  }
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : "An unknown error occurred.";
}

export async function resolveLocation(
  onStepChange?: StepChangeListener
): Promise<NormalizedLocation> {
  const steps = INITIAL_LOCATION_STEPS.map((step) => ({ ...step }));

  const setStep = (
    id: StepId,
    status: StepStatus,
    detail?: string,
    reason?: BrowserFailureReason
  ) => {
    const step = steps.find((s) => s.id === id)!;
    step.status = status;
    step.detail = detail;
    step.reason = reason;
    onStepChange?.(steps.map((s) => ({ ...s })));
  };

  onStepChange?.(steps.map((s) => ({ ...s })));

  const hints = collectHints();

  setStep("browser-geolocation", "trying");
  try {
    const coords = await getBrowserCoordinates();
    setStep(
      "browser-geolocation",
      "success",
      `accuracy ±${Math.round(coords.accuracyMeters)}m`
    );

    setStep("reverse-geocode", "trying");
    try {
      const address = await reverseGeocode(coords);
      setStep("reverse-geocode", "success");
      setStep("ip-geolocation", "skipped", "browser location resolved");

      return {
        ...address,
        latitude: coords.latitude,
        longitude: coords.longitude,
        accuracyMeters: coords.accuracyMeters,
        source: "browser",
        hints,
      };
    } catch (error) {
      setStep("reverse-geocode", "failed", messageOf(error));
    }
  } catch (error) {
    const reason = error instanceof GeolocationError ? error.reason : "unknown";
    setStep("browser-geolocation", "failed", messageOf(error), reason);
    setStep("reverse-geocode", "skipped", "no coordinates to geocode");
  }

  setStep("ip-geolocation", "trying");
  try {
    const ipResult = await getIpGeolocation();
    setStep("ip-geolocation", "success");

    return {
      ...ipResult,
      source: "ip",
      hints,
    };
  } catch (error) {
    setStep("ip-geolocation", "failed", messageOf(error));
    throw new LocationResolutionError(
      "All location detection methods failed.",
      steps.map((s) => ({ ...s }))
    );
  }
}
