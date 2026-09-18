import type { LocationStep, StepStatus } from "../types/location.ts";

const STATUS_LABEL: Record<StepStatus, string> = {
  idle: "Idle",
  trying: "Trying…",
  success: "Success",
  failed: "Failed",
  skipped: "Skipped",
};

const STATUS_BADGE_CLASSES: Record<StepStatus, string> = {
  idle: "bg-slate-100 text-slate-500",
  trying: "bg-blue-100 text-blue-700",
  success: "bg-green-100 text-green-700",
  failed: "bg-red-100 text-red-700",
  skipped: "bg-slate-100 text-slate-500",
};

interface LocationStepsProps {
  steps: LocationStep[];
}

export default function LocationSteps({ steps }: LocationStepsProps) {
  return (
    <ol aria-live="polite" className="mt-4 space-y-2">
      {steps.map((step, index) => (
        <li
          key={step.id}
          className="flex items-center justify-between gap-3 rounded-lg border border-slate-100 px-3 py-2 text-sm"
        >
          <span className="text-slate-600">
            <span className="text-slate-400">{index + 1}.</span> {step.label}
            {step.detail && (
              <span className="block text-xs text-slate-400">{step.detail}</span>
            )}
          </span>
          <span
            className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE_CLASSES[step.status]}`}
          >
            {STATUS_LABEL[step.status]}
          </span>
        </li>
      ))}
    </ol>
  );
}
