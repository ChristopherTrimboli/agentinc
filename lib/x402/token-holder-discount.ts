/**
 * Token Holder Discount
 *
 * Users who hold an agent's SPL token get 20% off AI inference costs
 * and pay using that token instead of SOL.
 *
 * Flow:
 * 1. Chat request includes `payWithAgentToken: true`
 * 2. Server checks if the user's wallet holds the agent's token (cached 60s)
 * 3. If yes, cost is discounted 20% and converted to token amount via DexScreener
 * 4. SPL tokens are transferred from the user's Privy wallet to the treasury
 */

import { Connection, PublicKey } from "@solana/web3.js";

import { SOLANA_RPC_URL } from "@/lib/constants/solana";
import { isRedisConfigured, getRedis } from "@/lib/redis";

// ── Constants ────────────────────────────────────────────────────────────────

/** Percentage discount applied to token-paying users */
export const TOKEN_DISCOUNT_RATE = 0.2;

/** Multiplier applied to USD cost for token holders (0.80 = 20% off) */
export const TOKEN_DISCOUNT_MULTIPLIER = 1 - TOKEN_DISCOUNT_RATE;

/** Redis TTL for cached token holding checks */
const TOKEN_HOLDING_CACHE_TTL = 60; // seconds

/** Redis TTL for cached token USD prices */
const TOKEN_PRICE_CACHE_TTL = 30; // seconds

// ── Types ────────────────────────────────────────────────────────────────────

export interface TokenHoldingResult {
  holdsToken: boolean;
  /** UI-unit balance (e.g. 100.5 tokens) */
  balance: number;
  /** Decimal places for this token (typically 6 or 9) */
  decimals: number;
}

// ── Token Holding Check ──────────────────────────────────────────────────────

/**
 * Check whether a wallet holds a specific SPL token.
 *
 * Result is cached in Redis for 60 seconds to avoid hammering the RPC
 * on every streamed chat message.
 *
 * @param walletAddress - User's Solana wallet address
 * @param mintAddress - Agent's SPL token mint address
 */
export async function checkTokenHolding(
  walletAddress: string,
  mintAddress: string,
): Promise<TokenHoldingResult> {
  const cacheKey = `token-holding:${walletAddress}:${mintAddress}`;

  if (isRedisConfigured()) {
    try {
      const cached = await getRedis().get<TokenHoldingResult>(cacheKey);
      if (cached) return cached;
    } catch {
      // Fall through to live check
    }
  }

  try {
    const connection = new Connection(SOLANA_RPC_URL, "confirmed");
    const walletPubkey = new PublicKey(walletAddress);
    const mintPubkey = new PublicKey(mintAddress);

    const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
      walletPubkey,
      { mint: mintPubkey },
    );

    let balance = 0;
    let decimals = 6;

    if (tokenAccounts.value.length > 0) {
      const parsed = tokenAccounts.value[0].account.data.parsed.info;
      balance = parsed.tokenAmount.uiAmount ?? 0;
      decimals = parsed.tokenAmount.decimals ?? 6;
    }

    const result: TokenHoldingResult = {
      holdsToken: balance > 0,
      balance,
      decimals,
    };

    if (isRedisConfigured()) {
      try {
        await getRedis().set(cacheKey, result, {
          ex: TOKEN_HOLDING_CACHE_TTL,
        });
      } catch {
        // Non-critical
      }
    }

    return result;
  } catch (error) {
    console.error("[TokenDiscount] Error checking token holding:", error);
    return { holdsToken: false, balance: 0, decimals: 6 };
  }
}

// ── Token Price ───────────────────────────────────────────────────────────────

/**
 * Fetch the USD price of an SPL token from DexScreener.
 *
 * Selects the pair with the highest liquidity to get the most accurate price.
 * Returns null when the token has no price data (e.g. zero-liquidity pair).
 *
 * @param mintAddress - SPL token mint address
 */
export async function getTokenPriceUsd(
  mintAddress: string,
): Promise<number | null> {
  const cacheKey = `token-price-usd:${mintAddress}`;

  if (isRedisConfigured()) {
    try {
      const cached = await getRedis().get<number>(cacheKey);
      if (cached !== null && cached !== undefined) return cached;
    } catch {
      // Fall through to live fetch
    }
  }

  try {
    const response = await fetch(
      `https://api.dexscreener.com/latest/dex/tokens/${mintAddress}`,
    );

    if (!response.ok) return null;

    const data = (await response.json()) as {
      pairs?: Array<{
        baseToken?: { address: string };
        priceUsd?: string;
        liquidity?: { usd?: number };
      }>;
    };

    if (!data.pairs?.length) return null;

    let bestPrice: number | null = null;
    let bestLiquidity = 0;

    for (const pair of data.pairs) {
      if (pair.baseToken?.address === mintAddress && pair.priceUsd) {
        const liquidity = pair.liquidity?.usd ?? 0;
        if (liquidity > bestLiquidity) {
          bestLiquidity = liquidity;
          bestPrice = parseFloat(pair.priceUsd);
        }
      }
    }

    if (bestPrice !== null && bestPrice > 0 && isRedisConfigured()) {
      try {
        await getRedis().set(cacheKey, bestPrice, {
          ex: TOKEN_PRICE_CACHE_TTL,
        });
      } catch {
        // Non-critical
      }
    }

    return bestPrice;
  } catch (error) {
    console.error("[TokenDiscount] Error fetching token price:", error);
    return null;
  }
}

// ── Discount Helpers ──────────────────────────────────────────────────────────

/**
 * Apply the 20% token holder discount to a USD cost.
 */
export function applyTokenDiscount(usdCost: number): number {
  return usdCost * TOKEN_DISCOUNT_MULTIPLIER;
}

/**
 * Convert a discounted USD amount to a token quantity.
 * Returns null when the price is unavailable or zero.
 *
 * @param usdAmount - USD value (post-discount)
 * @param tokenPriceUsd - Current token price in USD
 */
export function usdToTokenAmount(
  usdAmount: number,
  tokenPriceUsd: number,
): number | null {
  if (!tokenPriceUsd || tokenPriceUsd <= 0) return null;
  return usdAmount / tokenPriceUsd;
}
