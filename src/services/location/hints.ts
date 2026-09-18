import type { LocationHints } from "../../types/location.ts";

export function collectHints(): LocationHints {
  const hints: LocationHints = {};

  try {
    hints.timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    // Intl unsupported/unavailable — leave timezone undefined.
  }

  if (typeof navigator !== "undefined" && navigator.language) {
    hints.locale = navigator.language;
  }

  return hints;
}
