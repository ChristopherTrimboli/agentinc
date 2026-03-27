/**
 * Revenue Sharing Constants
 *
 * Configuration for the $AGENTINC token holder revenue sharing system.
 * 50% of platform profit is distributed to eligible holders every 5 minutes,
 * weighted by tier multiplier.
 */

import { AGENTINC_TOKEN_MINT } from "@/lib/constants/mint";

// ── Revenue Share Rates ──────────────────────────────────────────────────────

/** Platform fee applied on top of AI Gateway costs (20% markup) */
export const PLATFORM_FEE_RATE = 0.2;

/** Fraction of platform profit distributed to token holders */
export const REVENUE_SHARE_RATE = 0.5;

// ── Holder Tiers ─────────────────────────────────────────────────────────────

/** Number of decimals for the $AGENTINC SPL token */
export const AGENTINC_TOKEN_DECIMALS = 9;

/** Minimum token balance to qualify for revenue sharing (Bronze entry) */
export const MIN_HOLDING_AMOUNT = 5_000_000;

/**
 * Wallets excluded from revenue sharing regardless of balance.
 * Used to filter out protocol-owned accounts (e.g. liquidity pools, vaults).
 */
export const HOLDER_BLACKLIST = new Set([
  "HLnpSz9h2S4hiLQ43rnSD9XkcUThA7B8hQMKmDaiTLcC", // Meteora Pool Authority
  "GrNkeWK1zFFcbbz5akatAXuRCC7QZCnMLGwbYtLDcSTj", // Agent Inc. team wallet
]);

/**
 * Tier definitions ordered from highest to lowest.
 * The first matching tier (balance >= minTokens) is assigned.
 */
export const REVENUE_SHARE_TIERS = [
  { name: "Diamond", minTokens: 30_000_000, multiplier: 3.0 },
  { name: "Gold", minTokens: 20_000_000, multiplier: 2.0 },
  { name: "Silver", minTokens: 10_000_000, multiplier: 1.5 },
  { name: "Bronze", minTokens: 5_000_000, multiplier: 1.0 },
] as const;

export type RevShareTierName = (typeof REVENUE_SHARE_TIERS)[number]["name"];

// ── Distribution Config ──────────────────────────────────────────────────────

/** Minimum lamports to justify a payout TX (below this, accumulate to next cycle) */
export const DUST_THRESHOLD_LAMPORTS = 10_000;

/** Max holders to process per distribution cycle (safety cap for push-based) */
export const MAX_HOLDERS_PER_CYCLE = 200;

/** Batch size for sequential treasury payouts (release wallet lock between batches) */
export const PAYOUT_BATCH_SIZE = 10;

// ── Cache Config ─────────────────────────────────────────────────────────────

/** Redis TTL for cached eligible holder list (seconds) */
export const HOLDER_CACHE_TTL = 300;

// ── Redis Keys ───────────────────────────────────────────────────────────────

/** Max pages to fetch from Helius DAS (safety cap: 50 pages = 50k accounts) */
export const MAX_HOLDER_PAGES = 50;

export const REDIS_KEYS = {
  REVENUE_EVENTS: "revenue:events",
  PENDING_POOL: "revshare:pending_pool",
  ELIGIBLE_HOLDERS: "revshare:eligible_holders",
  ELIGIBLE_COUNT: "revshare:eligible_count",
  LAST_REFRESH: "revshare:last_refresh",
} as const;

// ── Types ────────────────────────────────────────────────────────────────────

export type RevenueEventType = "x402_flat" | "usage_based" | "token_payment";

export interface RevenueEvent {
  timestamp: number;
  type: RevenueEventType;
  /** What the user paid (lamports) */
  grossLamports: number;
  /** Estimated cost to the platform (lamports) */
  costLamports: number;
  /** Profit = gross - cost (lamports) */
  profitLamports: number;
  txSignature?: string;
  userId?: string;
}

export interface EligibleHolder {
  wallet: string;
  balance: number;
  tier: RevShareTierName;
  multiplier: number;
}

export interface DistributionResult {
  success: boolean;
  totalProfitLamports: number;
  distributedLamports: number;
  holderCount: number;
  payouts: Array<{
    wallet: string;
    amountLamports: number;
    tier: string;
    txSignature?: string;
    status: "sent" | "failed";
  }>;
  rolledOverLamports: number;
  error?: string;
}

// Re-export for convenience
export { AGENTINC_TOKEN_MINT };
