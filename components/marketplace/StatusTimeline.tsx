"use client";

import { motion } from "framer-motion";
import { Check, AlertTriangle, X } from "lucide-react";

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
              {/* Connector line */}
              {i > 0 && (
                <div className="absolute top-4 right-1/2 h-0.5 w-full -translate-y-1/2">
                  <div
                    className={cn(
                      "h-full w-full rounded-full transition-colors",
                      isCancelled
                        ? "bg-white/5"
                        : isCompleted || isActive
                          ? "bg-coral"
                          : "bg-white/5",
                    )}
                  />
                  {(isCompleted || isActive) && !isCancelled && (
                    <motion.div
                      initial={{ scaleX: 0 }}
                      animate={{ scaleX: 1 }}
                      transition={{ duration: 0.4, delay: i * 0.1 }}
                      className="absolute inset-0 h-full origin-left rounded-full bg-coral"
                    />
                  )}
                </div>
              )}

              {/* Circle */}
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.3, delay: i * 0.08 }}
                className={cn(
                  "relative z-10 flex size-8 items-center justify-center rounded-full border-2 text-xs font-bold transition-all",
                  isCancelled
                    ? "border-white/10 bg-white/5 text-white/20"
                    : isCompleted
                      ? "border-coral bg-coral text-black"
                      : isActive
                        ? "border-coral bg-coral/20 text-coral shadow-[0_0_12px_rgba(111,236,6,0.3)]"
                        : "border-white/10 bg-surface text-white/25",
                )}
              >
                {isCompleted && !isCancelled ? (
                  <Check className="size-3.5" />
                ) : (
                  i + 1
                )}
              </motion.div>

              {/* Label */}
              <span
                className={cn(
                  "mt-2 text-center text-[10px] font-medium leading-tight",
                  isCancelled
                    ? "text-white/20"
                    : isCompleted || isActive
                      ? "text-white/80"
                      : "text-white/25",
                )}
              >
                {STEP_LABELS[step]}
              </span>
            </div>
          );
        })}
      </div>

      {/* Disputed indicator */}
      {isDisputed && (
        <motion.div
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-3 flex items-center justify-center gap-2"
        >
          <div className="h-4 w-0.5 bg-red-500/30" />
          <div className="flex items-center gap-1.5 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-1">
            <AlertTriangle className="size-3 text-red-400" />
            <span className="text-xs font-semibold text-red-400">Disputed</span>
          </div>
        </motion.div>
      )}

      {/* Cancelled indicator */}
      {isCancelled && (
        <motion.div
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-3 flex items-center justify-center gap-2"
        >
          <div className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1">
            <X className="size-3 text-white/40" />
            <span className="text-xs font-medium text-white/40">Cancelled</span>
          </div>
        </motion.div>
      )}
    </div>
  );
}
