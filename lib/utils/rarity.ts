/**
 * Shared rarity color definitions used across the app.
 *
 * This is the CANONICAL source of truth for all rarity-related colors and styles.
 * Do NOT duplicate rarity color maps in component files - import from here instead.
 */

export type Rarity = "common" | "uncommon" | "rare" | "epic" | "legendary";

// =============================================================================
// FULL RARITY COLORS (border, bg, text, glow, gradient)
// =============================================================================

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

// =============================================================================
// RAW HEX COLORS (for non-Tailwind contexts like canvas, swarm, server-side)
// =============================================================================

export const RARITY_HEX_COLORS: Record<Rarity, string> = {
  common: "#6b7280",
  uncommon: "#22c55e",
  rare: "#3b82f6",
  epic: "#a855f7",
  legendary: "#f59e0b",
};

// =============================================================================
// RING COLORS (for avatar/card borders)
// =============================================================================

export const RARITY_RING_COLORS: Record<Rarity, string> = {
  legendary: "ring-[#FFD700]",
  epic: "ring-[#A855F7]",
  rare: "ring-[#3B82F6]",
  uncommon: "ring-[#6FEC06]",
  common: "ring-white/20",
};

// =============================================================================
// BADGE STYLES (for listing cards)
// =============================================================================

export interface RarityBadgeStyle {
  bg: string;
  text: string;
  border: string;
}

export const RARITY_BADGE_STYLES: Record<Rarity, RarityBadgeStyle> = {
  legendary: {
    bg: "bg-[#FFD700]/20",
    text: "text-[#FFD700]",
    border: "border-[#FFD700]/50",
  },
  epic: {
    bg: "bg-[#A855F7]/20",
    text: "text-[#A855F7]",
    border: "border-[#A855F7]/50",
  },
  rare: {
    bg: "bg-[#3B82F6]/20",
    text: "text-[#3B82F6]",
    border: "border-[#3B82F6]/50",
  },
  uncommon: {
    bg: "bg-[#6FEC06]/20",
    text: "text-[#6FEC06]",
    border: "border-[#6FEC06]/50",
  },
  common: {
    bg: "bg-gray-500/20",
    text: "text-gray-400",
    border: "border-gray-500/50",
  },
};

// =============================================================================
// DETAILED CARD STYLES (for agent detail pages with glow + gradient)
// =============================================================================

export interface RarityDetailStyle {
  border: string;
  bg: string;
  text: string;
  glow: string;
  gradient: string;
}

export const RARITY_DETAIL_STYLES: Record<Rarity, RarityDetailStyle> = {
  legendary: {
    border: "border-[#FFD700]",
    bg: "bg-[#FFD700]/10",
    text: "text-[#FFD700]",
    glow: "shadow-[0_0_40px_rgba(255,215,0,0.4)]",
    gradient: "from-[#FFD700]/20 via-[#FFA500]/10 to-transparent",
  },
  epic: {
    border: "border-[#A855F7]",
    bg: "bg-[#A855F7]/10",
    text: "text-[#A855F7]",
    glow: "shadow-[0_0_40px_rgba(168,85,247,0.4)]",
    gradient: "from-[#A855F7]/20 via-[#7C3AED]/10 to-transparent",
  },
  rare: {
    border: "border-[#3B82F6]",
    bg: "bg-[#3B82F6]/10",
    text: "text-[#3B82F6]",
    glow: "shadow-[0_0_40px_rgba(59,130,246,0.4)]",
    gradient: "from-[#3B82F6]/20 via-[#2563EB]/10 to-transparent",
  },
  uncommon: {
    border: "border-[#6FEC06]",
    bg: "bg-[#6FEC06]/10",
    text: "text-[#6FEC06]",
    glow: "shadow-[0_0_40px_rgba(111,236,6,0.4)]",
    gradient: "from-[#6FEC06]/20 via-[#22C55E]/10 to-transparent",
  },
  common: {
    border: "border-gray-500/30",
    bg: "bg-gray-500/10",
    text: "text-gray-400",
    glow: "",
    gradient: "from-gray-500/20 to-gray-600/20",
  },
};

// =============================================================================
// CHAT SELECTOR STYLES (for agent selection cards with hover effects)
// =============================================================================

export interface RaritySelectorStyle {
  ring: string;
  glow: string;
  bg: string;
  hoverRing: string;
  hoverGlow: string;
  hoverText: string;
  accent: string;
  hoverOverlay: string;
}

export const RARITY_SELECTOR_STYLES: Record<Rarity, RaritySelectorStyle> = {
  legendary: {
    ring: "ring-[#FFD700]",
    glow: "shadow-[0_0_30px_rgba(255,215,0,0.4)]",
    bg: "bg-[#FFD700]/5",
    hoverRing: "hover:ring-[#FFD700]",
    hoverGlow: "hover:shadow-[0_0_25px_rgba(255,215,0,0.3)]",
    hoverText: "group-hover:text-[#FFD700]",
    accent: "text-[#FFD700]",
    hoverOverlay: "group-hover:bg-[#FFD700]/5",
  },
  epic: {
    ring: "ring-[#A855F7]",
    glow: "shadow-[0_0_30px_rgba(168,85,247,0.4)]",
    bg: "bg-[#A855F7]/5",
    hoverRing: "hover:ring-[#A855F7]",
    hoverGlow: "hover:shadow-[0_0_25px_rgba(168,85,247,0.3)]",
    hoverText: "group-hover:text-[#A855F7]",
    accent: "text-[#A855F7]",
    hoverOverlay: "group-hover:bg-[#A855F7]/5",
  },
  rare: {
    ring: "ring-[#3B82F6]",
    glow: "shadow-[0_0_30px_rgba(59,130,246,0.4)]",
    bg: "bg-[#3B82F6]/5",
    hoverRing: "hover:ring-[#3B82F6]",
    hoverGlow: "hover:shadow-[0_0_25px_rgba(59,130,246,0.3)]",
    hoverText: "group-hover:text-[#3B82F6]",
    accent: "text-[#3B82F6]",
    hoverOverlay: "group-hover:bg-[#3B82F6]/5",
  },
  uncommon: {
    ring: "ring-[#6FEC06]",
    glow: "shadow-[0_0_30px_rgba(111,236,6,0.4)]",
    bg: "bg-[#6FEC06]/5",
    hoverRing: "hover:ring-[#6FEC06]",
    hoverGlow: "hover:shadow-[0_0_25px_rgba(111,236,6,0.3)]",
    hoverText: "group-hover:text-[#6FEC06]",
    accent: "text-[#6FEC06]",
    hoverOverlay: "group-hover:bg-[#6FEC06]/5",
  },
  common: {
    ring: "ring-white/20",
    glow: "",
    bg: "",
    hoverRing: "hover:ring-white/30",
    hoverGlow: "",
    hoverText: "group-hover:text-white/80",
    accent: "text-white/60",
    hoverOverlay: "group-hover:bg-white/5",
  },
};

// =============================================================================
// INCORPORATE STYLES (for incorporate/corporation cards)
// =============================================================================

export interface RarityIncorporateStyle {
  bg: string;
  border: string;
  text: string;
  glow: string;
}

export const RARITY_INCORPORATE_STYLES: Record<Rarity, RarityIncorporateStyle> =
  {
    common: {
      bg: "bg-gray-500/20",
      border: "border-gray-500/40",
      text: "text-gray-400",
      glow: "shadow-gray-500/20",
    },
    uncommon: {
      bg: "bg-green-500/20",
      border: "border-green-500/40",
      text: "text-green-400",
      glow: "shadow-green-500/20",
    },
    rare: {
      bg: "bg-blue-500/20",
      border: "border-blue-500/40",
      text: "text-blue-400",
      glow: "shadow-blue-500/20",
    },
    epic: {
      bg: "bg-purple-500/20",
      border: "border-purple-500/40",
      text: "text-purple-400",
      glow: "shadow-purple-500/20",
    },
    legendary: {
      bg: "bg-amber-500/20",
      border: "border-amber-500/40",
      text: "text-amber-400",
      glow: "shadow-amber-500/20",
    },
  };

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

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

/**
 * Get rarity ring class for avatar borders
 */
export function getRarityRingColor(rarity: string | null | undefined): string {
  const normalized = (rarity?.toLowerCase() || "common") as Rarity;
  return RARITY_RING_COLORS[normalized] || RARITY_RING_COLORS.common;
}

/**
 * Get rarity badge style for marketplace cards
 */
export function getRarityBadgeStyle(
  rarity: string | null | undefined,
): RarityBadgeStyle {
  const normalized = (rarity?.toLowerCase() || "common") as Rarity;
  return RARITY_BADGE_STYLES[normalized] || RARITY_BADGE_STYLES.common;
}

/**
 * Get rarity detail style for agent detail pages
 */
export function getRarityDetailStyle(
  rarity: string | null | undefined,
): RarityDetailStyle {
  const normalized = (rarity?.toLowerCase() || "common") as Rarity;
  return RARITY_DETAIL_STYLES[normalized] || RARITY_DETAIL_STYLES.common;
}

/**
 * Get rarity selector style for chat agent selection
 */
export function getRaritySelectorStyle(
  rarity: string | null | undefined,
): RaritySelectorStyle {
  const normalized = (rarity?.toLowerCase() || "common") as Rarity;
  return RARITY_SELECTOR_STYLES[normalized] || RARITY_SELECTOR_STYLES.common;
}

/**
 * Get rarity incorporate style for corporation cards
 */
export function getRarityIncorporateStyle(
  rarity: string | null | undefined,
): RarityIncorporateStyle {
  const normalized = (rarity?.toLowerCase() || "common") as Rarity;
  return (
    RARITY_INCORPORATE_STYLES[normalized] || RARITY_INCORPORATE_STYLES.common
  );
}
