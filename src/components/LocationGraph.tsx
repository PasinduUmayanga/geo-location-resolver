import type {
  BrowserFailureReason,
  LocationStep,
  NormalizedLocation,
} from "../types/location.ts";
import type { ResolverStatus } from "../hooks/useLocationResolver.ts";

type NodeStatus = "pending" | "active" | "success" | "failed" | "skipped";

const NODE_BADGE_CLASSES: Record<NodeStatus, string> = {
  pending: "bg-slate-100 text-slate-500",
  active: "bg-blue-100 text-blue-700",
  success: "bg-green-100 text-green-700",
  failed: "bg-red-100 text-red-700",
  skipped: "bg-slate-100 text-slate-500",
};

const NODE_BORDER_CLASSES: Record<NodeStatus, string> = {
  pending: "border-slate-200",
  active: "border-blue-300",
  success: "border-green-300",
  failed: "border-red-300",
  skipped: "border-slate-200",
};

const NODE_STATUS_LABEL: Record<NodeStatus, string> = {
  pending: "Idle",
  active: "Trying…",
  success: "Success",
  failed: "Failed",
  skipped: "Skipped",
};

type BrowserEdgeKey = "success" | "permission-denied" | "position-unavailable" | "other";

const BROWSER_EDGES: Array<{ key: BrowserEdgeKey; label: string; to: string }> = [
  { key: "success", label: "Location ON + permission ALLOWED", to: "Reverse Geocode" },
  {
    key: "permission-denied",
    label: "Permission denied (or OS location off, browser-dependent)",
    to: "IP Geolocation Fallback",
  },
  {
    key: "position-unavailable",
    label: "Position unavailable / OS location off",
    to: "IP Geolocation Fallback",
  },
  {
    key: "other",
    label: "Timeout / unsupported / other",
    to: "IP Geolocation Fallback",
  },
];

function reasonToEdgeKey(reason: BrowserFailureReason | undefined): BrowserEdgeKey {
  if (reason === "permission-denied") return "permission-denied";
  if (reason === "position-unavailable") return "position-unavailable";
  return "other";
}

function findStep(steps: LocationStep[], id: LocationStep["id"]) {
  return steps.find((s) => s.id === id);
}

function toNodeStatus(status: LocationStep["status"] | undefined): NodeStatus {
  switch (status) {
    case "trying":
      return "active";
    case "success":
      return "success";
    case "failed":
      return "failed";
    case "skipped":
      return "skipped";
    default:
      return "pending";
  }
}

interface GraphNodeProps {
  title: string;
  status: NodeStatus;
  detail?: string;
  children?: React.ReactNode;
}

function GraphNode({ title, status, detail, children }: GraphNodeProps) {
  return (
    <div
      className={`rounded-lg border px-3 py-2 text-sm ${NODE_BORDER_CLASSES[status]}`}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="font-medium text-slate-700">{title}</span>
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${NODE_BADGE_CLASSES[status]}`}
        >
          {NODE_STATUS_LABEL[status]}
        </span>
      </div>
      {detail && <p className="mt-1 text-xs text-slate-400">{detail}</p>}
      {children}
    </div>
  );
}

function Connector() {
  return (
    <div className="flex justify-center text-slate-300" aria-hidden="true">
      ↓
    </div>
  );
}

interface LocationGraphProps {
  status: ResolverStatus;
  steps: LocationStep[];
  result: NormalizedLocation | null;
}

export default function LocationGraph({ status, steps, result }: LocationGraphProps) {
  const browserStep = findStep(steps, "browser-geolocation");
  const reverseStep = findStep(steps, "reverse-geocode");
  const ipStep = findStep(steps, "ip-geolocation");

  const takenEdgeKey: BrowserEdgeKey | null =
    browserStep?.status === "success"
      ? "success"
      : browserStep?.status === "failed"
        ? reasonToEdgeKey(browserStep.reason)
        : null;

  const resultNode: { title: string; status: NodeStatus } =
    status === "success" && result
      ? {
          title:
            result.source === "browser"
              ? "Result: Browser Location (precise)"
              : "Result: IP Location (approximate)",
          status: "success",
        }
      : status === "error"
        ? { title: "Result: All methods failed", status: "failed" }
        : { title: "Result", status: "pending" };

  return (
    <div aria-live="polite" className="mt-4 space-y-1">
      <GraphNode title="Start" status="success" />
      <Connector />

      <GraphNode
        title="Browser Geolocation"
        status={toNodeStatus(browserStep?.status)}
        detail={browserStep?.detail}
      />

      <ol className="my-2 ml-4 space-y-1 border-l border-slate-200 pl-3">
        {BROWSER_EDGES.map((edge) => {
          const isTaken = takenEdgeKey === edge.key;
          return (
            <li
              key={edge.key}
              className={`text-xs ${
                isTaken
                  ? "font-medium text-slate-700"
                  : "text-slate-300"
              }`}
            >
              {isTaken ? "▶" : "┄"} {edge.label} → {edge.to}
            </li>
          );
        })}
      </ol>

      <GraphNode
        title="Reverse Geocode"
        status={toNodeStatus(reverseStep?.status)}
        detail={reverseStep?.detail}
      />
      <Connector />

      <GraphNode
        title="IP Geolocation Fallback"
        status={toNodeStatus(ipStep?.status)}
        detail={ipStep?.detail}
      >
        <ul className="mt-2 space-y-0.5 text-xs text-amber-600">
          <li>⚠ Mobile ISP location can be especially inaccurate.</li>
          <li>⚠ VPNs/proxies can skew IP-based location.</li>
        </ul>
      </GraphNode>
      <Connector />

      <GraphNode title={resultNode.title} status={resultNode.status} />
    </div>
  );
}
