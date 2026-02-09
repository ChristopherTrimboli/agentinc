"use client";

import { Star } from "lucide-react";
import { RARITIES } from "@/lib/agentTraits";

interface RarityBadgeProps {
  rarity: keyof typeof RARITIES;
}

export function RarityBadge({ rarity }: RarityBadgeProps) {
  const config = RARITIES[rarity];

  return (
    <div
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-black uppercase tracking-widest shadow-lg"
      style={{
        backgroundColor: `${config.color}20`,
        color: "#ffffff",
        border: `2px solid ${config.color}`,
        boxShadow: `0 0 20px ${config.color}40, inset 0 1px 0 ${config.color}30`,
        textShadow: `0 0 12px ${config.color}cc, 0 2px 4px rgba(0, 0, 0, 0.8)`,
      }}
    >
      <Star
        className="w-3.5 h-3.5 fill-current"
        style={{
          color: config.color,
          filter: `drop-shadow(0 0 4px ${config.color})`,
        }}
      />
      {config.name}
    </div>
  );
}
