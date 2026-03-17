"use client";

import Link from "next/link";
import {
  Clock,
  MapPin,
  MessageSquare,
  Flame,
  Coins,
  TrendingUp,
} from "lucide-react";
import { motion } from "framer-motion";

import { cn, timeAgo } from "@/lib/utils";
import {
  CATEGORY_LABELS,
  TASK_STATUS_LABELS,
  type MarketplaceCategory,
} from "@/lib/marketplace/types";

const STATUS_STYLES: Record<string, { className: string; dot: string }> = {
  open: {
    className: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    dot: "bg-emerald-400",
  },
  assigned: {
    className: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    dot: "bg-blue-400",
  },
  in_progress: {
    className: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    dot: "bg-amber-400",
  },
  review: {
    className: "bg-purple-500/10 text-purple-400 border-purple-500/20",
    dot: "bg-purple-400",
  },
  completed: {
    className: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    dot: "bg-emerald-400",
  },
  disputed: {
    className: "bg-red-500/10 text-red-400 border-red-500/20",
    dot: "bg-red-400",
  },
  cancelled: {
    className: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
    dot: "bg-zinc-400",
  },
};

interface TaskCardProps {
  id: string;
  title: string;
  description: string;
  category: string;
  status: string;
  budgetSol: number;
  isRemote: boolean;
  deadline?: string | null;
  bidCount: number;
  createdAt: string;
  index?: number;
  tokenSymbol?: string | null;
}

export default function TaskCard({
  id,
  title,
  description,
  category,
  status,
  budgetSol,
  isRemote,
  deadline,
  bidCount,
  createdAt,
  index = 0,
  tokenSymbol,
}: TaskCardProps) {
  const statusConfig = STATUS_STYLES[status] ?? STATUS_STYLES.open;
  const statusLabel =
    TASK_STATUS_LABELS[status as keyof typeof TASK_STATUS_LABELS] ?? status;
  const categoryLabel =
    CATEGORY_LABELS[category as MarketplaceCategory] ?? category;

  const URGENT_THRESHOLD_MS = 3 * 24 * 60 * 60 * 1000;
  const deadlineDate = deadline ? new Date(deadline) : null;
  const isValidDeadline = deadlineDate && !isNaN(deadlineDate.getTime());
  const isUrgent = isValidDeadline
    ? deadlineDate.getTime() - Date.now() < URGENT_THRESHOLD_MS
    : false;

  const hasToken = !!tokenSymbol;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: Math.min(index * 0.05, 0.4) }}
    >
      <Link
        href={`/dashboard/marketplace/tasks/${id}`}
        className={cn(
          "group relative block rounded-2xl border bg-surface/80 p-4 transition-all duration-300 hover:scale-[1.02] hover:-translate-y-0.5",
          hasToken
            ? "border-purple-500/15 hover:border-purple-500/30 hover:shadow-[0_0_30px_rgba(168,85,247,0.08)]"
            : "border-white/10 hover:border-coral/20 hover:shadow-[0_0_30px_rgba(111,236,6,0.08)]",
        )}
      >
        {/* Task Token shimmer */}
        {hasToken && (
          <div className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-br from-purple-500/[0.03] to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
        )}

        {/* Status + Budget */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                statusConfig.className,
              )}
            >
              <span className={cn("size-1.5 rounded-full", statusConfig.dot)} />
              {statusLabel}
            </span>
            {hasToken && (
              <span className="inline-flex items-center gap-1 rounded-md border border-purple-500/20 bg-purple-500/10 px-2 py-0.5 text-[10px] font-bold text-purple-400">
                <Coins className="size-2.5" />${tokenSymbol}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            {hasToken && budgetSol <= 0 && (
              <span className="inline-flex items-center gap-1 text-[10px] font-medium text-purple-400/60">
                <TrendingUp className="size-2.5" />
                fee bounty
              </span>
            )}
            {budgetSol > 0 && (
              <div className="text-right">
                <span className="text-lg font-bold text-coral">
                  {budgetSol}
                </span>
                <span className="ml-1 text-xs font-medium text-coral/60">
                  SOL
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Title + Description */}
        <h3 className="mt-3 truncate text-sm font-semibold text-white group-hover:text-coral transition-colors">
          {title}
        </h3>
        <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-white/50">
          {description}
        </p>

        {/* Tags row */}
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <span className="rounded-md bg-white/5 px-2 py-0.5 text-[10px] font-medium text-white/60">
            {categoryLabel}
          </span>
          {isRemote && (
            <span className="inline-flex items-center gap-1 rounded-md bg-blue-500/10 px-2 py-0.5 text-[10px] font-medium text-blue-400">
              <MapPin className="size-2.5" />
              Remote
            </span>
          )}
          {isValidDeadline && (
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-medium",
                isUrgent
                  ? "bg-red-500/10 text-red-400"
                  : "bg-white/5 text-white/50",
              )}
            >
              {isUrgent ? (
                <Flame className="size-2.5" />
              ) : (
                <Clock className="size-2.5" />
              )}
              {deadlineDate.toLocaleDateString()}
            </span>
          )}
        </div>

        {/* Footer */}
        <div className="mt-3 flex items-center justify-between border-t border-white/5 pt-3 text-xs text-white/40">
          <span className="flex items-center gap-1.5">
            <MessageSquare className="size-3" />
            <span className="font-medium text-white/60">{bidCount}</span>{" "}
            {bidCount === 1 ? "bid" : "bids"}
          </span>
          <span>{timeAgo(createdAt)}</span>
        </div>
      </Link>
    </motion.div>
  );
}
