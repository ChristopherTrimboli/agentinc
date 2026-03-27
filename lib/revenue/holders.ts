/**
 * Eligible Holder Registry
 *
 * Fetches and caches $AGENTINC holders who qualify for revenue sharing.
 * Uses Helius DAS `getTokenAccounts` to enumerate all holders,
 * filters by minimum balance, and assigns tier multipliers.
 *
 * Results are cached in Redis for 120 seconds to avoid hammering the RPC.
 */

import { SOLANA_RPC_URL } from "@/lib/constants/solana";
import { isRedisConfigured, getRedis } from "@/lib/redis";

import {
  AGENTINC_TOKEN_MINT,
  AGENTINC_TOKEN_DECIMALS,
  MIN_HOLDING_AMOUNT,
  HOLDER_BLACKLIST,
  REVENUE_SHARE_TIERS,
  HOLDER_CACHE_TTL,
  MAX_HOLDER_PAGES,
  REDIS_KEYS,
  type EligibleHolder,
  type RevShareTierName,
} from "./constants";

// ── Helius DAS Types ─────────────────────────────────────────────────────────

interface HeliusTokenAccount {
  address: string;
  owner: string;
  amount: number;
}

interface HeliusResponse {
  result?: {
    token_accounts?: HeliusTokenAccount[];
    cursor?: string;
  };
  error?: { message: string };
}

// ── Tier Assignment ──────────────────────────────────────────────────────────

/**
 * Assign a revenue share tier based on token balance.
 * Tiers are checked from highest to lowest — first match wins.
 */
function assignTier(balance: number): {
  tier: RevShareTierName;
  multiplier: number;
} | null {
  for (const tier of REVENUE_SHARE_TIERS) {
    if (balance >= tier.minTokens) {
      return { tier: tier.name, multiplier: tier.multiplier };
    }
  }
  return null;
}

// ── Holder Fetching ──────────────────────────────────────────────────────────

/**
 * Fetch all $AGENTINC holders via Helius DAS `getTokenAccounts`.
 * Paginates through all results (no limit cap) to find every qualifying wallet.
 */
async function fetchAllHolders(): Promise<EligibleHolder[]> {
  const eligible: EligibleHolder[] = [];
  let cursor: string | undefined;
  let pageCount = 0;
  const pageSize = 1000;

  while (pageCount < MAX_HOLDER_PAGES) {
    pageCount++;
    const params: Record<string, unknown> = {
      mint: AGENTINC_TOKEN_MINT,
      limit: pageSize,
      displayOptions: { showZeroBalance: false },
    };
    if (cursor) {
      params.cursor = cursor;
    }

    const response = await fetch(SOLANA_RPC_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: "revshare-holders",
        method: "getTokenAccounts",
        params,
      }),
    });

    const data = (await response.json()) as HeliusResponse;

    if (data.error) {
      throw new Error(`Helius API error: ${data.error.message}`);
    }

    const accounts = data.result?.token_accounts ?? [];

    for (const account of accounts) {
      if (HOLDER_BLACKLIST.has(account.owner)) continue;

      const uiBalance = account.amount / Math.pow(10, AGENTINC_TOKEN_DECIMALS);

      if (uiBalance < MIN_HOLDING_AMOUNT) continue;

      const tierInfo = assignTier(uiBalance);
      if (!tierInfo) continue;

      eligible.push({
        wallet: account.owner,
        balance: uiBalance,
        tier: tierInfo.tier,
        multiplier: tierInfo.multiplier,
      });
    }

    cursor = data.result?.cursor;
    if (!cursor || accounts.length < pageSize) break;
  }

  // Sort by balance descending for consistent ordering
  eligible.sort((a, b) => b.balance - a.balance);
  return eligible;
}

// ── Cached Public API ────────────────────────────────────────────────────────

/**
 * Get all eligible $AGENTINC holders for revenue sharing.
 *
 * Returns cached results when available (120s TTL).
 * Falls back to a live Helius DAS fetch on cache miss.
 */
export async function getEligibleHolders(): Promise<EligibleHolder[]> {
  if (isRedisConfigured()) {
    try {
      const cached = await getRedis().get<EligibleHolder[]>(
        REDIS_KEYS.ELIGIBLE_HOLDERS,
      );
      if (cached && cached.length > 0) return cached;
    } catch {
      // Fall through to live fetch
    }
  }

  try {
    const holders = await fetchAllHolders();

    if (isRedisConfigured()) {
      try {
        const redis = getRedis();
        await redis.set(REDIS_KEYS.ELIGIBLE_HOLDERS, holders, {
          ex: HOLDER_CACHE_TTL,
        });
        await redis.set(REDIS_KEYS.ELIGIBLE_COUNT, holders.length, {
          ex: HOLDER_CACHE_TTL,
        });
        await redis.set(REDIS_KEYS.LAST_REFRESH, Date.now(), {
          ex: HOLDER_CACHE_TTL * 10,
        });
      } catch {
        // Non-critical
      }
    }

    return holders;
  } catch (error) {
    console.error("[Revenue] Failed to fetch eligible holders:", error);
    return [];
  }
}

/**
 * Get a summary of the current eligible holder state (for the stats API).
 */
export async function getHolderStats(): Promise<{
  totalHolders: number;
  tierBreakdown: Record<string, number>;
  lastRefresh: number | null;
}> {
  const holders = await getEligibleHolders();

  const tierBreakdown: Record<string, number> = {};
  for (const tier of REVENUE_SHARE_TIERS) {
    tierBreakdown[tier.name] = 0;
  }
  for (const holder of holders) {
    tierBreakdown[holder.tier] = (tierBreakdown[holder.tier] ?? 0) + 1;
  }

  let lastRefresh: number | null = null;
  if (isRedisConfigured()) {
    try {
      lastRefresh = await getRedis().get<number>(REDIS_KEYS.LAST_REFRESH);
    } catch {
      // Non-critical
    }
  }

  return { totalHolders: holders.length, tierBreakdown, lastRefresh };
}
