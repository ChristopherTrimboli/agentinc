"use client";

import Image from "next/image";
import Link from "next/link";
import { Clock, Bot, User, Zap } from "lucide-react";
import { motion } from "framer-motion";

import { cn, timeAgo } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const BID_STATUS_CONFIG: Record<
  string,
  { label: string; className: string; dot: string }
> = {
  pending: {
    label: "Pending",
    className: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    dot: "bg-amber-400",
  },
  accepted: {
    label: "Accepted",
    className: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    dot: "bg-emerald-400",
  },
  rejected: {
    label: "Rejected",
    className: "bg-red-500/10 text-red-400 border-red-500/20",
    dot: "bg-red-400",
  },
  withdrawn: {
    label: "Withdrawn",
    className: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
    dot: "bg-zinc-400",
  },
};

interface BidCardProps {
  id: string;
  amountSol: number;
  message?: string | null;
  estimatedTime?: string | null;
  status: string;
  createdAt: string;
  bidder?: {
    id: string;
    activeWallet?: { address: string } | null;
  } | null;
  bidderAgent?: { id: string; name: string; imageUrl: string | null } | null;
  isTaskPoster?: boolean;
  onAccept?: (bidId: string) => void;
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
  const config = BID_STATUS_CONFIG[status] ?? BID_STATUS_CONFIG.pending;
  const walletAddr = bidder?.activeWallet?.address;
  const bidderName =
    bidderAgent?.name ??
    (walletAddr
      ? `${walletAddr.slice(0, 4)}...${walletAddr.slice(-4)}`
      : "Anonymous");
  const bidderImage = bidderAgent?.imageUrl ?? null;
  const isAgent = !!bidderAgent;
  const bidderWallet = bidder?.activeWallet?.address ?? null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-white/10 bg-surface/80 p-4 transition-all hover:border-white/15"
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          {bidderImage ? (
            <Image
              src={bidderImage}
              alt={bidderName}
              width={36}
              height={36}
              className="size-9 rounded-lg object-cover ring-1 ring-white/10"
            />
          ) : (
            <div className="flex size-9 items-center justify-center rounded-lg bg-white/5 ring-1 ring-white/10">
              {isAgent ? (
                <Bot className="size-4 text-cyan-400/60" />
              ) : (
                <User className="size-4 text-white/40" />
              )}
            </div>
          )}
          <div className="min-w-0">
            {bidderWallet ? (
              <Link
                href={`/profile/${bidderWallet}`}
                className="block truncate text-sm font-medium text-white hover:text-[#6FEC06] transition-colors"
              >
                {bidderName}
              </Link>
            ) : (
              <p className="truncate text-sm font-medium text-white">
                {bidderName}
              </p>
            )}
            <p className="text-[10px] text-white/30">{timeAgo(createdAt)}</p>
          </div>
        </div>

        <span
          className={cn(
            "shrink-0 inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[10px] font-semibold",
            config.className,
          )}
        >
          <span className={cn("size-1.5 rounded-full", config.dot)} />
          {config.label}
        </span>
      </div>

      {/* Amount */}
      <div className="mt-3 flex items-baseline gap-1">
        <span className="text-xl font-bold text-coral">{amountSol}</span>
        <span className="text-xs font-medium text-coral/50">SOL</span>
      </div>

      {/* Message */}
      {message && (
        <p className="mt-2 text-sm leading-relaxed text-white/50 line-clamp-3">
          {message}
        </p>
      )}

      {/* Estimated time */}
      {estimatedTime && (
        <div className="mt-2 inline-flex items-center gap-1.5 rounded-md bg-white/5 px-2.5 py-1 text-xs text-white/40">
          <Clock className="size-3" />
          {estimatedTime}
        </div>
      )}

      {/* Accept button */}
      {isTaskPoster && status === "pending" && onAccept && (
        <Button
          onClick={() => onAccept(id)}
          className="mt-3 w-full bg-coral text-black hover:bg-coral/90 font-semibold shadow-lg shadow-coral/10"
          size="sm"
        >
          <Zap className="mr-1.5 size-3.5" />
          Accept Bid
        </Button>
      )}
    </motion.div>
  );
}
