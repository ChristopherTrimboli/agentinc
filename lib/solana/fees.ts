/**
 * Solana Priority Fee Estimation & Compute Budget
 *
 * Provides dynamic priority fee estimation based on recent network activity
 * and helpers to create compute budget instructions for any transaction.
 *
 * Every transaction should prepend the two instructions returned by
 * `createComputeBudgetInstructions()` to ensure timely landing during
 * network congestion.
 */

import {
  ComputeBudgetProgram,
  type TransactionInstruction,
} from "@solana/web3.js";
import { SOLANA_RPC_URL } from "@/lib/constants/solana";

// ── Fee Bounds ───────────────────────────────────────────────────────

/** Default priority fee when estimation fails (microLamports) */
const DEFAULT_PRIORITY_FEE = 50_000;

/** Minimum fee floor (microLamports) */
const MIN_PRIORITY_FEE = 1_000;

/** Maximum fee cap to prevent overspend (microLamports) */
const MAX_PRIORITY_FEE = 10_000_000;

/** Cache TTL — avoid hammering the RPC during burst operations (ms) */
const FEE_CACHE_TTL_MS = 10_000;

// ── Compute Unit Presets ─────────────────────────────────────────────

/** CU limit presets for common transaction types */
export const COMPUTE_UNITS = {
  /** Simple SOL transfer */
  SOL_TRANSFER: 50_000,
  /** Single SPL token transfer (may include ATA creation) */
  TOKEN_TRANSFER: 200_000,
  /** Batch token airdrop per-transaction */
  TOKEN_BATCH: 300_000,
  /** Staking operations (create pool, stake, unstake, claim) */
  STAKING: 400_000,
} as const;

// ── Internal Cache ───────────────────────────────────────────────────

let _cache: { microLamports: number; ts: number } | null = null;

// ── Core Functions ───────────────────────────────────────────────────

/**
 * Estimate the optimal priority fee from recent slots.
 *
 * Calls `getRecentPrioritizationFees` (standard Solana RPC) and returns
 * the median non-zero fee, clamped to [MIN, MAX]. The result is cached
 * for 10 s so batch operations don't issue redundant RPC calls.
 *
 * @param accounts - Optional account addresses to scope the estimate
 */
export async function estimatePriorityFee(
  accounts?: string[],
): Promise<number> {
  if (_cache && Date.now() - _cache.ts < FEE_CACHE_TTL_MS) {
    return _cache.microLamports;
  }

  try {
    const response = await fetch(SOLANA_RPC_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: "fee-estimate",
        method: "getRecentPrioritizationFees",
        params: accounts && accounts.length > 0 ? [accounts] : [],
      }),
      signal: AbortSignal.timeout(5_000),
    });

    const data = await response.json();
    const slots: { slot: number; prioritizationFee: number }[] =
      data.result ?? [];

    const fees = slots
      .map((s) => s.prioritizationFee)
      .filter((f) => f > 0)
      .sort((a, b) => a - b);

    if (fees.length === 0) return DEFAULT_PRIORITY_FEE;

    // Median fee — balanced between cost and landing speed
    const median = fees[Math.floor(fees.length / 2)];
    const clamped = Math.max(
      MIN_PRIORITY_FEE,
      Math.min(median, MAX_PRIORITY_FEE),
    );

    _cache = { microLamports: clamped, ts: Date.now() };
    return clamped;
  } catch (error) {
    console.error(
      "[Fees] Priority fee estimation failed, using default:",
      error,
    );
    return DEFAULT_PRIORITY_FEE;
  }
}

/**
 * Build the two compute-budget instructions that should be prepended
 * to every transaction:
 *   1. `setComputeUnitLimit` — caps CU usage
 *   2. `setComputeUnitPrice` — sets priority fee in microLamports
 *
 * @param computeUnits - CU limit (use COMPUTE_UNITS presets)
 * @param accounts - Optional account addresses for scoped fee estimation
 */
export async function createComputeBudgetInstructions(
  computeUnits: number,
  accounts?: string[],
): Promise<TransactionInstruction[]> {
  const microLamports = await estimatePriorityFee(accounts);

  return [
    ComputeBudgetProgram.setComputeUnitLimit({ units: computeUnits }),
    ComputeBudgetProgram.setComputeUnitPrice({ microLamports }),
  ];
}
