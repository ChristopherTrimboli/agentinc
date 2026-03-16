"use client";

import { Lock, Check, Undo2 } from "lucide-react";

import { cn } from "@/lib/utils";

interface EscrowBadgeProps {
  status: string;
  amount?: number;
}

const CONFIG: Record<
  string,
  {
    icon: typeof Lock;
    label: string;
    className: string;
    pulse?: boolean;
  } | null
> = {
  none: null,
  held: {
    icon: Lock,
    label: "Escrow Held",
    className: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    pulse: true,
  },
  released: {
    icon: Check,
    label: "Released",
    className: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  },
  refunded: {
    icon: Undo2,
    label: "Refunded",
    className: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  },
};

export default function EscrowBadge({ status, amount }: EscrowBadgeProps) {
  const config = CONFIG[status];
  if (!config) return null;

  const { icon: Icon, label, className, pulse } = config;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold",
        className,
      )}
    >
      <Icon className={cn("size-3", pulse && "animate-pulse")} />
      {label}
      {amount !== undefined && <span className="font-bold">{amount} SOL</span>}
    </span>
  );
}
