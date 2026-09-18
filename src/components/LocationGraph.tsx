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

const EDGE_TEXT_CLASSES: Record<NodeStatus, string> = {
  pending: "text-slate-300",
  active: "font-medium text-blue-600",
  success: "font-medium text-green-700",
  failed: "font-medium text-red-700",
  skipped: "text-slate-300",
};

type BrowserEdgeKey = "success" | "permission-denied" | "position-unavailable" | "other";

const BROWSER_EDGES: Array<{ key: BrowserEdgeKey; label: string }> = [
  { key: "success", label: "Location ON + permission ALLOWED" },
  {
    key: "permission-denied",
    label: "Permission denied (or OS location off, browser-dependent)",
  },
  { key: "position-unavailable", label: "Position unavailable / OS location off" },
  { key: "other", label: "Timeout / unsupported / other" },
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
  fullWidth?: boolean;
}

function GraphNode({ title, status, detail, children, fullWidth }: GraphNodeProps) {
  return (
    <div
      className={`${fullWidth ? "w-full" : "w-52 shrink-0"} rounded-lg border bg-white px-3 py-2 text-sm transition-colors duration-300 ${NODE_BORDER_CLASSES[status]} ${status === "active" ? "animate-pulse" : ""}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-1">
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

function Arrow() {
  return (
    <span
      aria-hidden="true"
      className="flex shrink-0 items-center text-lg leading-none text-slate-300"
    >
      →
    </span>
  );
}

function DownConnector() {
  return (
    <div aria-hidden="true" className="flex justify-center text-slate-300">
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

  const browserStatus = toNodeStatus(browserStep?.status);
  const reverseStatus = toNodeStatus(reverseStep?.status);
  const ipStatus = toNodeStatus(ipStep?.status);

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

  const failureEdges = BROWSER_EDGES.filter((edge) => edge.key !== "success");
  const successEdge = BROWSER_EDGES[0];

  return (
    <>
      {/* Below Tailwind's xl / 1280px breakpoint — the horizontal tree's actual
          minimum content width (min-w-[1000px] plus padding) — there isn't
          "enough" room to show it without internal scrolling, so every phone,
          tablet, and most laptop windows (e.g. a Xiaomi 15 Ultra at ~450-460px,
          an iPad at 768-1024px, a 1366px laptop) get this vertical stepper instead. */}
      <div
        aria-live="polite"
        data-testid="detection-tree-mobile"
        className="mt-4 space-y-2 xl:hidden"
      >
        <GraphNode title="Start" status="success" fullWidth />
        <DownConnector />
        <GraphNode
          title="Browser Geolocation"
          status={browserStatus}
          detail={browserStep?.detail}
          fullWidth
        />
        <DownConnector />
        <GraphNode
          title="Reverse Geocode"
          status={reverseStatus}
          detail={reverseStep?.detail}
          fullWidth
        />
        <DownConnector />
        <GraphNode
          title="IP Geolocation Fallback"
          status={ipStatus}
          detail={ipStep?.detail}
          fullWidth
        >
          <ul className="mt-2 space-y-0.5 text-xs text-amber-600">
            <li>⚠ Mobile ISP location can be especially inaccurate.</li>
            <li>⚠ VPNs/proxies can skew IP-based location.</li>
          </ul>
        </GraphNode>
        <DownConnector />
        <GraphNode title={resultNode.title} status={resultNode.status} fullWidth />
      </div>

      {/* xl and up: enough width for the full horizontal branching tree to fit without scrolling. */}
      <div
        aria-live="polite"
        data-testid="detection-tree"
        className="hidden overflow-x-auto xl:mt-4 xl:block"
      >
        <div
          data-testid="detection-tree-row"
          className="flex min-w-[1000px] items-stretch gap-3 pb-2"
        >
          <div className="flex items-center">
            <GraphNode title="Start" status="success" />
          </div>
          <Arrow />
          <div className="flex items-center">
            <GraphNode
              title="Browser Geolocation"
              status={browserStatus}
              detail={browserStep?.detail}
            />
          </div>
          <Arrow />

          <div className="flex flex-col justify-center gap-2">
            <div className="flex items-center gap-2">
              <span className={`w-72 text-xs ${EDGE_TEXT_CLASSES[takenEdgeKey === successEdge.key ? reverseStatus : "pending"]}`}>
                {takenEdgeKey === successEdge.key ? "▶" : "┄"} {successEdge.label}
              </span>
              <Arrow />
              <GraphNode
                title="Reverse Geocode"
                status={reverseStatus}
                detail={reverseStep?.detail}
              />
            </div>

            <ol className="ml-1 space-y-1 border-l-2 border-slate-200 pl-2">
              {failureEdges.map((edge) => {
                const isTaken = takenEdgeKey === edge.key;
                return (
                  <li
                    key={edge.key}
                    className={`w-72 text-xs ${EDGE_TEXT_CLASSES[isTaken ? ipStatus : "pending"]}`}
                  >
                    {isTaken ? "▶" : "┄"} {edge.label}
                  </li>
                );
              })}
            </ol>

            <div className="flex items-center gap-2">
              <span
                className={`w-72 text-xs ${EDGE_TEXT_CLASSES[reverseStep?.status === "failed" ? ipStatus : "pending"]}`}
              >
                {reverseStep?.status === "failed" ? "▶" : "┄"} Reverse Geocode failed
              </span>
              <Arrow />
              <GraphNode title="IP Geolocation Fallback" status={ipStatus} detail={ipStep?.detail}>
                <ul className="mt-2 space-y-0.5 text-xs text-amber-600">
                  <li>⚠ Mobile ISP location can be especially inaccurate.</li>
                  <li>⚠ VPNs/proxies can skew IP-based location.</li>
                </ul>
              </GraphNode>
            </div>
          </div>

          <Arrow />
          <div className="flex items-center">
            <GraphNode title={resultNode.title} status={resultNode.status} />
          </div>
        </div>
      </div>
    </>
  );
}
