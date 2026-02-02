/**
 * Shared rarity color definitions used across the app
 */

export type Rarity = "common" | "uncommon" | "rare" | "epic" | "legendary";

export interface RarityColors {
  border: string;
  bg: string;
  text: string;
  glow: string;
  gradient: string;
}

export const RARITY_COLORS: Record<Rarity, RarityColors> = {
  common: {
    border: "border-zinc-500/30",
    bg: "bg-zinc-500/10",
    text: "text-zinc-400",
    glow: "",
    gradient: "from-zinc-500/20 to-zinc-600/20",
  },
  uncommon: {
    border: "border-emerald-500/30",
    bg: "bg-emerald-500/10",
    text: "text-emerald-400",
    glow: "shadow-emerald-500/20",
    gradient: "from-emerald-500/20 to-emerald-600/20",
  },
  rare: {
    border: "border-blue-500/30",
    bg: "bg-blue-500/10",
    text: "text-blue-400",
    glow: "shadow-blue-500/20",
    gradient: "from-blue-500/20 to-blue-600/20",
  },
  epic: {
    border: "border-purple-500/30",
    bg: "bg-purple-500/10",
    text: "text-purple-400",
    glow: "shadow-purple-500/20",
    gradient: "from-purple-500/20 to-purple-600/20",
  },
  legendary: {
    border: "border-amber-500/30",
    bg: "bg-amber-500/10",
    text: "text-amber-400",
    glow: "shadow-amber-500/20",
    gradient: "from-amber-500/20 to-amber-600/20",
  },
};

export const RARITY_HEX_COLORS: Record<Rarity, string> = {
  common: "#6b7280",
  uncommon: "#22c55e",
  rare: "#3b82f6",
  epic: "#a855f7",
  legendary: "#f59e0b",
};

/**
 * Get rarity colors with fallback to common
 */
export function getRarityColors(
  rarity: string | null | undefined,
): RarityColors {
  const normalized = (rarity?.toLowerCase() || "common") as Rarity;
  return RARITY_COLORS[normalized] || RARITY_COLORS.common;
}

/**
 * Get rarity hex color with fallback to common
 */
export function getRarityHexColor(rarity: string | null | undefined): string {
  const normalized = (rarity?.toLowerCase() || "common") as Rarity;
  return RARITY_HEX_COLORS[normalized] || RARITY_HEX_COLORS.common;
}

/**
 * Get rarity badge classes
 */
export function getRarityBadgeClasses(
  rarity: string | null | undefined,
): string {
  const colors = getRarityColors(rarity);
  return `${colors.border} ${colors.bg} ${colors.text}`;
}
