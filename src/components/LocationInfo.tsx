import { useLocationResolver } from "../hooks/useLocationResolver.ts";
import LocationGraph from "./LocationGraph.tsx";
import LocationMap from "./LocationMap.tsx";

export default function LocationInfo() {
  const { status, steps, result, error, run } = useLocationResolver();

  const isRunning = status === "running";

  return (
    <div
      data-testid="location-card"
      className="w-full rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6"
    >
      <button
        onClick={run}
        disabled={isRunning}
        className="w-full rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-400"
      >
        {isRunning ? "Locating…" : "Get Location"}
      </button>

      {status !== "idle" && (
        <LocationGraph status={status} steps={steps} result={result} />
      )}

      {status === "error" && error && (
        <p className="mt-4 text-sm text-red-600">{error}</p>
      )}

      {status === "success" && result && (
        <div className="mt-4 rounded-lg border border-slate-200 p-3">
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
            Result
          </h2>
          {result.source === "ip" && (
            <p className="mb-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
              Approximate location — based on IP address, may be affected by
              VPNs/proxies.
            </p>
          )}

          <dl
            data-testid="result-grid"
            className="grid grid-cols-1 gap-x-6 gap-y-2 text-sm text-slate-700 sm:grid-cols-2 lg:grid-cols-3"
          >
            <div className="flex justify-between border-b border-slate-100 pb-1">
              <dt className="font-medium text-slate-500">Country</dt>
              <dd>{result.country || "Unknown"}</dd>
            </div>
            <div className="flex justify-between border-b border-slate-100 pb-1">
              <dt className="font-medium text-slate-500">Region</dt>
              <dd>{result.region || "Unknown"}</dd>
            </div>
            <div className="flex justify-between border-b border-slate-100 pb-1">
              <dt className="font-medium text-slate-500">City</dt>
              <dd>{result.city || "Unknown"}</dd>
            </div>
            {result.latitude !== undefined && result.longitude !== undefined && (
              <>
                <div className="flex justify-between border-b border-slate-100 pb-1">
                  <dt className="font-medium text-slate-500">Latitude</dt>
                  <dd>{result.latitude.toFixed(6)}</dd>
                </div>
                <div className="flex justify-between border-b border-slate-100 pb-1">
                  <dt className="font-medium text-slate-500">Longitude</dt>
                  <dd>{result.longitude.toFixed(6)}</dd>
                </div>
              </>
            )}
            {result.accuracyMeters !== undefined && (
              <div className="flex justify-between border-b border-slate-100 pb-1">
                <dt className="font-medium text-slate-500">Accuracy</dt>
                <dd>±{Math.round(result.accuracyMeters)}m</dd>
              </div>
            )}
            {result.ispName && (
              <div className="flex justify-between border-b border-slate-100 pb-1">
                <dt className="font-medium text-slate-500">ISP</dt>
                <dd>{result.ispName}</dd>
              </div>
            )}
            {result.asn && (
              <div className="flex justify-between border-b border-slate-100 pb-1">
                <dt className="font-medium text-slate-500">ASN</dt>
                <dd>{result.asn}</dd>
              </div>
            )}
            <div className="flex justify-between pb-1">
              <dt className="font-medium text-slate-500">Source</dt>
              <dd className="capitalize">{result.source}</dd>
            </div>
          </dl>

          {result.latitude !== undefined && result.longitude !== undefined && (
            <LocationMap latitude={result.latitude} longitude={result.longitude} />
          )}
        </div>
      )}
    </div>
  );
}
