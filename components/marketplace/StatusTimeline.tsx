"use client";

import { cn } from "@/lib/utils";

interface StatusTimelineProps {
  currentStatus: string;
}

const STEPS = [
  "open",
  "assigned",
  "in_progress",
  "review",
  "completed",
] as const;

const STEP_LABELS: Record<string, string> = {
  open: "Open",
  assigned: "Assigned",
  in_progress: "In Progress",
  review: "Review",
  completed: "Completed",
};

export default function StatusTimeline({ currentStatus }: StatusTimelineProps) {
  const isCancelled = currentStatus === "cancelled";
  const isDisputed = currentStatus === "disputed";

  const activeIndex = STEPS.indexOf(currentStatus as (typeof STEPS)[number]);
  const effectiveIndex = isDisputed ? STEPS.indexOf("review") : activeIndex;

  return (
    <div className="w-full">
      <div className="flex items-start justify-between">
        {STEPS.map((step, i) => {
          const isCompleted = !isCancelled && effectiveIndex > i;
          const isActive = !isCancelled && effectiveIndex === i && !isDisputed;
          const isFuture = isCancelled || effectiveIndex < i;

          return (
            <div
              key={step}
              className="relative flex flex-1 flex-col items-center"
            >
              {/* Connector line (except first step) */}
              {i > 0 && (
                <div
                  className={cn(
                    "absolute top-3 right-1/2 h-0.5 w-full -translate-y-1/2",
                    isCancelled
                      ? "bg-white/10"
                      : isCompleted || isActive
                        ? "bg-[#6FEC06]"
                        : "bg-white/10",
                  )}
                />
              )}

              {/* Circle */}
              <div
                className={cn(
                  "relative z-10 flex size-6 items-center justify-center rounded-full border-2 text-xs font-bold transition-colors",
                  isCancelled
                    ? "border-white/10 bg-white/5 text-white/30"
                    : isCompleted
                      ? "border-[#6FEC06] bg-[#6FEC06] text-black"
                      : isActive
                        ? "border-[#6FEC06] bg-[#6FEC06]/20 text-[#6FEC06]"
                        : "border-white/10 bg-white/5 text-white/30",
                )}
              >
                {isCompleted && !isCancelled ? "✓" : i + 1}
              </div>

              {/* Label */}
              <span
                className={cn(
                  "mt-1.5 text-center text-[10px] leading-tight",
                  isCancelled
                    ? "text-white/30"
                    : isCompleted || isActive
                      ? "text-white/90"
                      : "text-white/30",
                )}
              >
                {STEP_LABELS[step]}
              </span>
            </div>
          );
        })}
      </div>

      {/* Disputed branch from Review */}
      {isDisputed && (
        <div className="mt-2 flex items-center justify-center gap-2">
          <div className="h-4 w-0.5 bg-red-500/50" />
          <div className="flex items-center gap-1.5">
            <div className="flex size-6 items-center justify-center rounded-full border-2 border-red-500 bg-red-500/20 text-xs font-bold text-red-400">
              !
            </div>
            <span className="text-xs font-medium text-red-400">Disputed</span>
          </div>
        </div>
      )}

      {/* Cancelled indicator */}
      {isCancelled && (
        <div className="mt-2 text-center text-xs font-medium text-white/30">
          Cancelled
        </div>
      )}
    </div>
  );
}
