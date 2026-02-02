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
      className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold uppercase tracking-wider"
      style={{ backgroundColor: `${config.color}20`, color: config.color }}
    >
      <Star className="w-3 h-3" />
      {config.name}
    </div>
  );
}
