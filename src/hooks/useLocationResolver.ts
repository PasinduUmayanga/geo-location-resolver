import { useCallback, useState } from "react";
import { INITIAL_LOCATION_STEPS } from "../types/location.ts";
import type { LocationStep, NormalizedLocation } from "../types/location.ts";
import { LocationResolutionError, resolveLocation } from "../services/location/resolveLocation.ts";

export type ResolverStatus = "idle" | "running" | "success" | "error";

export function useLocationResolver() {
  const [status, setStatus] = useState<ResolverStatus>("idle");
  const [steps, setSteps] = useState<LocationStep[]>(INITIAL_LOCATION_STEPS);
  const [result, setResult] = useState<NormalizedLocation | null>(null);
  const [error, setError] = useState("");

  const run = useCallback(async () => {
    setStatus("running");
    setResult(null);
    setError("");

    try {
      const location = await resolveLocation(setSteps);
      setResult(location);
      setStatus("success");
    } catch (err) {
      if (err instanceof LocationResolutionError) {
        setSteps(err.steps);
      }
      setError(err instanceof Error ? err.message : "An unknown error occurred.");
      setStatus("error");
    }
  }, []);

  return { status, steps, result, error, run };
}
