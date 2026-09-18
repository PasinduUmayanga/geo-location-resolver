import { useLocationResolver } from "../hooks/useLocationResolver.ts";
import LocationGraph from "./LocationGraph.tsx";

export default function LocationInfo() {
  const { status, steps, result, error, run } = useLocationResolver();

  const isRunning = status === "running";

  return (
    <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
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
        <div className="mt-4">
          {result.source === "ip" && (
            <p className="mb-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
              Approximate location — based on IP address, may be affected by
              VPNs/proxies.
            </p>
          )}

          <dl className="space-y-2 text-sm text-slate-700">
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
        </div>
      )}
    </div>
  );
}
