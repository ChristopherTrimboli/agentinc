"use client";

import Image from "next/image";
import { Clock, Bot, User } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const BID_STATUS_STYLES: Record<string, string> = {
  pending: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
  accepted: "bg-green-500/15 text-green-400 border-green-500/30",
  rejected: "bg-red-500/15 text-red-400 border-red-500/30",
  withdrawn: "bg-gray-500/15 text-gray-400 border-gray-500/30",
};

const BID_STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  accepted: "Accepted",
  rejected: "Rejected",
  withdrawn: "Withdrawn",
};

interface BidCardProps {
  id: string;
  amountSol: number;
  message?: string | null;
  estimatedTime?: string | null;
  status: string;
  createdAt: string;
  bidder?: { id: string; email: string | null } | null;
  bidderAgent?: { id: string; name: string; imageUrl: string | null } | null;
  isTaskPoster?: boolean;
  onAccept?: (bidId: string) => void;
}

function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function BidCard({
  id,
  amountSol,
  message,
  estimatedTime,
  status,
  createdAt,
  bidder,
  bidderAgent,
  isTaskPoster,
  onAccept,
}: BidCardProps) {
  const statusStyle = BID_STATUS_STYLES[status] ?? BID_STATUS_STYLES.pending;
  const statusLabel = BID_STATUS_LABELS[status] ?? status;

  const bidderName = bidderAgent?.name ?? bidder?.email ?? "Anonymous";
  const bidderImage = bidderAgent?.imageUrl ?? null;
  const isAgent = !!bidderAgent;

  return (
    <div className="rounded-xl border border-white/10 bg-[#0a0520]/80 p-4">
      {/* Header: bidder + status */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          {bidderImage ? (
            <Image
              src={bidderImage}
              alt={bidderName}
              width={32}
              height={32}
              className="size-8 rounded-full object-cover border border-white/20"
            />
          ) : (
            <div className="flex size-8 items-center justify-center rounded-full border border-white/20 bg-white/5">
              {isAgent ? (
                <Bot className="size-4 text-white/60" />
              ) : (
                <User className="size-4 text-white/60" />
              )}
            </div>
          )}
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-white">
              {bidderName}
            </p>
            <p className="text-xs text-white/40">{timeAgo(createdAt)}</p>
          </div>
        </div>

        <span
          className={cn(
            "shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-medium",
            statusStyle,
          )}
        >
          {statusLabel}
        </span>
      </div>

      {/* Amount */}
      <div className="mt-3 text-lg font-bold text-[#6FEC06]">
        {amountSol} SOL
      </div>

      {/* Message */}
      {message && (
        <p className="mt-2 text-sm text-white/60 line-clamp-3">{message}</p>
      )}

      {/* Estimated time */}
      {estimatedTime && (
        <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-white/5 px-2 py-0.5 text-xs text-white/50">
          <Clock className="size-3" />
          {estimatedTime}
        </div>
      )}

      {/* Accept button for task poster */}
      {isTaskPoster && status === "pending" && onAccept && (
        <Button
          onClick={() => onAccept(id)}
          className="mt-3 w-full bg-[#6FEC06] text-black hover:bg-[#6FEC06]/90 font-semibold"
          size="sm"
        >
          Accept Bid
        </Button>
      )}
    </div>
  );
}
