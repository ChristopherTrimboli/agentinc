"use client";

import Link from "next/link";
import { Clock, MapPin, MessageSquare } from "lucide-react";

import { cn, timeAgo } from "@/lib/utils";
import {
  CATEGORY_LABELS,
  TASK_STATUS_LABELS,
  type MarketplaceCategory,
} from "@/lib/marketplace/types";

const STATUS_STYLES: Record<string, string> = {
  open: "bg-green-500/15 text-green-400 border-green-500/30",
  assigned: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  in_progress: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
  review: "bg-purple-500/15 text-purple-400 border-purple-500/30",
  completed: "bg-green-500/15 text-green-400 border-green-500/30",
  disputed: "bg-red-500/15 text-red-400 border-red-500/30",
  cancelled: "bg-gray-500/15 text-gray-400 border-gray-500/30",
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
}: TaskCardProps) {
  const statusStyle = STATUS_STYLES[status] ?? STATUS_STYLES.open;
  const statusLabel = TASK_STATUS_LABELS[status as keyof typeof TASK_STATUS_LABELS] ?? status;
  const categoryLabel =
    CATEGORY_LABELS[category as MarketplaceCategory] ?? category;

  return (
    <Link
      href={`/marketplace/tasks/${id}`}
      className="group block rounded-2xl border border-white/10 bg-[#0a0520]/80 p-4 transition-all hover:border-white/20 hover:scale-[1.02]"
    >
      {/* Status + Budget */}
      <div className="flex items-center justify-between">
        <span
          className={cn(
            "inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium",
            statusStyle,
          )}
        >
          {statusLabel}
        </span>
        <span className="text-lg font-bold text-[#6FEC06]">
          {budgetSol} SOL
        </span>
      </div>

      {/* Title + Description */}
      <h3 className="mt-3 truncate text-sm font-semibold text-white">
        {title}
      </h3>
      <p className="mt-1 line-clamp-2 text-sm text-white/60">{description}</p>

      {/* Tags row */}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-white/5 px-2 py-0.5 text-xs text-white/70">
          {categoryLabel}
        </span>
        {isRemote && (
          <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 px-2 py-0.5 text-xs text-blue-400">
            <MapPin className="size-3" />
            Remote
          </span>
        )}
        {deadline && (
          <span className="inline-flex items-center gap-1 rounded-full bg-white/5 px-2 py-0.5 text-xs text-white/50">
            <Clock className="size-3" />
            {new Date(deadline).toLocaleDateString()}
          </span>
        )}
      </div>

      {/* Footer */}
      <div className="mt-3 flex items-center justify-between border-t border-white/5 pt-3 text-xs text-white/50">
        <span className="flex items-center gap-1">
          <MessageSquare className="size-3" />
          {bidCount} {bidCount === 1 ? "bid" : "bids"}
        </span>
        <span>{timeAgo(createdAt)}</span>
      </div>
    </Link>
  );
}
