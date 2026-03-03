/** Types and visual constants for the 8004 network visualization. */

// ── API Response Types ───────────────────────────────────────────────────────

export interface NetworkData {
  stats: NetworkStats | null;
  collections: NetworkCollection[];
}

export interface NetworkStats {
  totalAgents: number;
  totalCollections: number;
  totalFeedbacks: number;
  totalValidations: number;
  platinumAgents: number;
  goldAgents: number;
  avgQuality: number | null;
}

export interface NetworkCollection {
  id: string;
  address: string;
  creator: string;
  name: string;
  symbol: string | null;
  description: string | null;
  image: string | null;
  bannerImage: string | null;
  website: string | null;
  twitter: string | null;
  agentCount: number;
  isOwn: boolean;
  agents: NetworkAgent[];
}

export interface NetworkAgent {
  asset: string;
  owner: string;
  name: string | null;
  uri: string | null;
  image: string | null;
  trustTier: number;
  qualityScore: number;
  feedbackCount: number;
  confidence: number;
  riskScore: number;
  diversityRatio: number;
  atomEnabled: boolean;
  createdAt: string;
  collectionPointer: string | null;
}

// ── Trust Tier Visual Constants ──────────────────────────────────────────────

export const TRUST_TIER_COLORS: Record<number, number> = {
  0: 0x6b7280,
  1: 0xcd7f32,
  2: 0x94a3b8,
  3: 0xeab308,
  4: 0xa78bfa,
};

export const TRUST_TIER_NAMES: Record<number, string> = {
  0: "Unrated",
  1: "Bronze",
  2: "Silver",
  3: "Gold",
  4: "Platinum",
};

export const TRUST_TIER_CSS: Record<number, { bg: string; text: string }> = {
  0: { bg: "bg-gray-500/20", text: "text-gray-400" },
  1: { bg: "bg-amber-700/20", text: "text-amber-600" },
  2: { bg: "bg-slate-400/20", text: "text-slate-300" },
  3: { bg: "bg-yellow-500/20", text: "text-yellow-400" },
  4: { bg: "bg-violet-500/20", text: "text-violet-400" },
};

// ── Collection Color Palette ─────────────────────────────────────────────────

export const COLLECTION_PALETTE = [
  0x8b5cf6, 0x06b6d4, 0xf59e0b, 0xef4444, 0xec4899, 0x6366f1, 0x14b8a6,
  0x3b82f6, 0xf97316, 0x84cc16,
];

export const AGENT_INC_COLOR = 0x10b981;

export function getCollectionColor(name: string, isOwn: boolean): number {
  if (isOwn) return AGENT_INC_COLOR;
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return COLLECTION_PALETTE[Math.abs(hash) % COLLECTION_PALETTE.length];
}

export function getCollectionCssColor(name: string, isOwn: boolean): string {
  const hex = getCollectionColor(name, isOwn);
  return `#${hex.toString(16).padStart(6, "0")}`;
}

// ── Sizing Helpers ───────────────────────────────────────────────────────────

const COLL_MIN_R = 35;
const COLL_MAX_R = 100;

export function getCollectionRadius(agentCount: number): number {
  return Math.min(COLL_MAX_R, COLL_MIN_R + Math.sqrt(agentCount) * 10);
}

const AGENT_MIN_R = 8;
const AGENT_MAX_R = 18;

export function getAgentRadius(qualityScore: number): number {
  return AGENT_MIN_R + (qualityScore / 100) * (AGENT_MAX_R - AGENT_MIN_R);
}
