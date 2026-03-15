"use client";

import { Lock, Check, Undo2 } from "lucide-react";

import { cn } from "@/lib/utils";

interface EscrowBadgeProps {
  status: string;
  amount?: number;
}

const CONFIG: Record<
  string,
  { icon: typeof Lock; label: string; className: string } | null
> = {
  none: null,
  held: {
    icon: Lock,
    label: "Escrow Held",
    className: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  },
  released: {
    icon: Check,
    label: "Released",
    className: "bg-green-500/15 text-green-400 border-green-500/30",
  },
  refunded: {
    icon: Undo2,
    label: "Refunded",
    className: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  },
};

export default function EscrowBadge({ status, amount }: EscrowBadgeProps) {
  const config = CONFIG[status];
  if (!config) return null;

  const { icon: Icon, label, className } = config;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium",
        className,
      )}
    >
      <Icon className="size-3" />
      {label}
      {amount !== undefined && <span className="font-bold">{amount} SOL</span>}
    </span>
  );
}
