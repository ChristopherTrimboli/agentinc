"use client";

import React from "react";
import { motion } from "framer-motion";
import {
  Check,
  AlertTriangle,
  X,
  Circle,
  UserCheck,
  Play,
  Eye,
  Trophy,
} from "lucide-react";

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

const STEP_META: Record<
  string,
  { label: string; icon: typeof Circle; color: string }
> = {
  open: { label: "Open", icon: Circle, color: "#34d399" },
  assigned: { label: "Assigned", icon: UserCheck, color: "#a78bfa" },
  in_progress: { label: "In Progress", icon: Play, color: "#38bdf8" },
  review: { label: "Review", icon: Eye, color: "#facc15" },
  completed: { label: "Completed", icon: Trophy, color: "#6FEC06" },
};

export default function StatusTimeline({ currentStatus }: StatusTimelineProps) {
  const isCancelled = currentStatus === "cancelled";
  const isDisputed = currentStatus === "disputed";

  const activeIndex = STEPS.indexOf(currentStatus as (typeof STEPS)[number]);
  const effectiveIndex = isDisputed ? STEPS.indexOf("review") : activeIndex;

  const elements: React.ReactNode[] = [];

  STEPS.forEach((step, i) => {
    const meta = STEP_META[step];
    const Icon = meta.icon;
    const isCompleted = !isCancelled && effectiveIndex > i;
    const isActive = !isCancelled && effectiveIndex === i && !isDisputed;
    const isReached = isCompleted || isActive;

    elements.push(
      <div key={step} className="flex shrink-0 flex-col items-center gap-1.5">
        {/* Circle node */}
        <div className="relative flex items-center justify-center size-8">
          {isActive && !isCancelled && (
            <div
              className="absolute inset-0 animate-timeline-pulse rounded-full"
              style={{
                borderColor: meta.color,
              }}
            />
          )}
          <motion.div
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{
              type: "spring",
              stiffness: 200,
              damping: 20,
              delay: i * 0.08,
            }}
            className={cn(
              "relative z-10 flex size-8 items-center justify-center rounded-full border-2 transition-all duration-300",
              isCancelled
                ? "border-white/10 bg-white/5 text-white/20"
                : isCompleted
                  ? "border-transparent text-black"
                  : isActive
                    ? "border-transparent"
                    : "border-white/10 bg-surface text-white/20",
            )}
            style={
              isCancelled
                ? undefined
                : isCompleted
                  ? { background: meta.color }
                  : isActive
                    ? {
                        background: `${meta.color}20`,
                        borderColor: meta.color,
                        boxShadow: `0 0 8px 1px ${meta.color}25`,
                      }
                    : undefined
            }
          >
            {isCompleted && !isCancelled ? (
              <Check className="size-3.5" strokeWidth={3} />
            ) : (
              <Icon
                className="size-3.5"
                style={isActive ? { color: meta.color } : undefined}
              />
            )}
          </motion.div>
        </div>

        {/* Label */}
        <motion.span
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: i * 0.08 + 0.1 }}
          className={cn(
            "text-center text-[10px] font-semibold uppercase tracking-wider leading-tight whitespace-nowrap",
            isCancelled
              ? "text-white/15"
              : isCompleted
                ? "text-white/70"
                : isActive
                  ? "text-white"
                  : "text-white/25",
          )}
          style={isActive ? { color: meta.color } : undefined}
        >
          {meta.label}
        </motion.span>
      </div>,
    );

    if (i < STEPS.length - 1) {
      const nextMeta = STEP_META[STEPS[i + 1]];
      elements.push(
        <div
          key={`line-${i}`}
          className="relative h-0.5 flex-1 min-w-3 mt-[15px] overflow-hidden rounded-full"
        >
          <div className="absolute inset-0 rounded-full bg-white/8" />
          {isReached && !isCancelled && (
            <motion.div
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{
                duration: 0.5,
                delay: i * 0.1,
                ease: "easeOut",
              }}
              className="absolute inset-0 origin-left rounded-full"
              style={{
                background: isCompleted
                  ? `linear-gradient(90deg, ${meta.color}, ${nextMeta.color})`
                  : `linear-gradient(90deg, ${meta.color}60, ${meta.color}15)`,
              }}
            />
          )}
        </div>,
      );
    }
  });

  return (
    <div className="w-full">
      <div className="flex items-start">{elements}</div>

      {/* Disputed indicator */}
      {isDisputed && (
        <motion.div
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-3 flex items-center justify-center gap-2"
        >
          <div className="h-4 w-0.5 bg-red-500/30" />
          <div className="flex items-center gap-1.5 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-1.5">
            <AlertTriangle className="size-3.5 text-red-400" />
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
          <div className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5">
            <X className="size-3.5 text-white/40" />
            <span className="text-xs font-medium text-white/40">Cancelled</span>
          </div>
        </motion.div>
      )}
    </div>
  );
}
